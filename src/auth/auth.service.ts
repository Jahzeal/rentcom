/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { SocialLoginDto } from './dto/social-login.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { UserRole } from 'generated/prisma/client';

@Injectable()
export class AuthService {
  verifySocialToken: any;
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async signup(dto: AuthDto) {
    // console.log('DATABASE_URL =', process.env.DATABASE_URL);
    const hash = await argon.hash(dto.password);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          hash,
          Firstname: dto.FirstName,
          Lastname: dto.LastName,
          role: dto.role,
        },
      });
      return this.signToken(user.id, user.email,user.role); // Return the created user
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Credentials already exists'); // Handle unique constraint violation
        }
      }
      console.log('error', error);
      throw new InternalServerErrorException('An error occurred during signup'); // Rethrow other errors
    }
  }

  async signin(dto: AuthDto) {
    //find the user by email
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });
    if (!user) throw new ForbiddenException('Credentials incorrect');
    //if user doesnt exist throw exemptions
    // compare password
    const pdMatches = await argon.verify(user.hash, dto.password);
    if (!pdMatches) throw new ForbiddenException('Credentials incorrect');
    // if pass doesnt incorrect throw exemption
    return this.signToken(user.id, user.email,user.role);
  }

  async signToken(userId: string, email: string,role: UserRole): Promise<{ access_token: string }> {
    const payload = {
      sub: userId,
      email,
      role
    };
    const jwtSecret = this.config.get<string>('JWT_SECRET');
    const token = await this.jwt.signAsync(payload, {
      expiresIn: '15m',
      secret: jwtSecret,
    },
    );
    return {
      access_token: token,
    }
  }
  //social media

  async socialLogin(dto: SocialLoginDto) {
    // Verify provider token (Google, Facebook, Apple)
    // Extract user email & profile

    const profile = await this.verifySocialToken(dto);

    // check if user exists
    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (!user) {
      const hash = await argon.hash(Math.random().toString());
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          hash,
          Firstname: profile.firstName,
          Lastname: profile.lastName,
        },
      });
    }

    return {
      message: 'social login success',
      user,
    };
  }
}
