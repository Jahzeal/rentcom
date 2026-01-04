/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto, AuthDtoSignin, VerifySignupDto } from './dto';
import * as argon from 'argon2';
import { SocialLoginDto } from './dto/social-login.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { UserRole } from '@prisma/client';
import { randomInt } from 'crypto';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AuthService {
  verifySocialToken: any;
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mailService: MailService,
  ) {}

   async signup(dto: AuthDto) {
    const email = dto.email.toLowerCase();

    // Check if user already exists
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ForbiddenException('Credentials already exist');

    // Delete old verification attempts
    await this.prisma.emailVerification.deleteMany({ where: { email } });

    // Hash password
    const hash = await argon.hash(dto.password);

    // Generate secure 6-digit code
    const code = randomInt(100000, 999999).toString();

    // Save verification record
    await this.prisma.emailVerification.create({
      data: {
        email,
        code,
        passwordHash: hash,
        attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min expiry
        lastSentAt: new Date(),
      },
    });

    // Send verification email
    await this.mailService.sendVerificationCode(email, code);

    return { message: 'Verification code sent to your email.' };
  }

  async verifySignup(dto: VerifySignupDto) {
    const email = dto.email.toLowerCase();

    const verification = await this.prisma.emailVerification.findFirst({
      where: {
        email,
        code: dto.code,
        expiresAt: { gt: new Date() },
      },
    });

    // Handle invalid/expired code
    if (!verification) {
      const record = await this.prisma.emailVerification.findFirst({ where: { email } });
      if (record) {
        if (record.attempts + 1 >= 5) {
          await this.prisma.emailVerification.delete({ where: { id: record.id } });
          throw new ForbiddenException('Too many failed attempts. Please request a new code.');
        }

        await this.prisma.emailVerification.update({
          where: { id: record.id },
          data: { attempts: { increment: 1 } },
        });
      }
      throw new ForbiddenException('Invalid or expired code');
    }

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        hash: verification.passwordHash,
        role: UserRole.USER,
      },
    });

    // Cleanup verification record
    await this.prisma.emailVerification.delete({ where: { id: verification.id } });

    // Auto-login after signup (use your existing signToken)
    return this.signToken(user.id, user.email, user.role);
  }

  async resendVerificationCode(email: string) {
    email = email.toLowerCase();

    const verification = await this.prisma.emailVerification.findFirst({ where: { email } });
    if (!verification) throw new NotFoundException('No verification request found. Please signup first.');

    // Cooldown: 60 seconds
    const now = new Date();
    const secondsSinceLastSend = (now.getTime() - verification.lastSentAt.getTime()) / 1000;
    if (secondsSinceLastSend < 60) throw new BadRequestException('Please wait before requesting a new code.');

    // Generate new secure code
    const newCode = randomInt(100000, 999999).toString();

    // Update record
    await this.prisma.emailVerification.update({
      where: { id: verification.id },
      data: {
        code: newCode,
        attempts: 0, // reset attempts
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        lastSentAt: now,
      },
    });

    // Send new code
    await this.mailService.sendVerificationCode(email, newCode);

    return { message: 'A new verification code has been sent to your email.' };
  }

  // STEP 4: CLEANUP EXPIRED VERIFICATIONS
  // Runs automatically every hour
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredVerifications() {
    await this.prisma.emailVerification.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    console.log('Expired verification records cleaned up');
  }


  async signin(dto: AuthDtoSignin) {
    //find the user by email
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
        role: dto.role,
      },
    });
    if (!user) throw new ForbiddenException('Credentials incorrect');
    //if user doesnt exist throw exemptions
    // compare password
    const pdMatches = await argon.verify(user.hash, dto.password);
    if (!pdMatches) throw new ForbiddenException('Credentials incorrect');
    // if pass doesnt incorrect throw exemption
    return this.signToken(user.id, user.email, user.role);
  }

  async forgotPassword(email: string) {
    email = email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User with this email does not exist');
    // Delete old verification attempts
    await this.prisma.passwordReset.deleteMany({ where: { email } });
    // Generate secure 6-digit code
    const code = randomInt(100000, 999999).toString();
    // Save verification record
    await this.prisma.passwordReset.create({
      data: {
        email,
        code,
        attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min expiry
        lastSentAt: new Date(),      },
    });
    // Send verification email
    await this.mailService.sendVerificationCode(email, code);
    return { message: 'Password reset code sent to your email.' };
  }

  async verifyForgotPasswordCode(dto: VerifySignupDto) {
  const email = dto.email.toLowerCase();

  const verification = await this.prisma.passwordReset.findFirst({
    where: {
      email,
      code: dto.code,
      expiresAt: { gt: new Date() },
    },
  });

  if (!verification) {
    const record = await this.prisma.passwordReset.findFirst({ where: { email } });

    if (record) {
      if (record.attempts + 1 >= 5) {
        await this.prisma.passwordReset.delete({ where: { id: record.id } });
        throw new ForbiddenException('Too many failed attempts. Please request a new code.');
      }

      await this.prisma.passwordReset.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
    }

    throw new ForbiddenException('Invalid or expired code');
  }

  // Code is valid — DO NOT update password here
  return { message: 'Code verified. You may now reset your password.' };
  }
  
  async resetPassword(email: string, code: string, newPassword: string) {
  email = email.toLowerCase();

  const verification = await this.prisma.passwordReset.findFirst({
    where: {
      email,
      code,
      expiresAt: { gt: new Date() },
    },
  });

  if (!verification) {
    throw new ForbiddenException('Invalid or expired reset code');
  }

  const hash = await argon.hash(newPassword);

  const user = await this.prisma.user.update({
    where: { email },
    data: { hash },
  });

  // cleanup
  await this.prisma.passwordReset.delete({
    where: { id: verification.id },
  });

  return { message: 'Password reset successful' };
}



  async resendVerificationCodeForgetpassword(email: string) {
    email = email.toLowerCase();

    const verification = await this.prisma.passwordReset.findFirst({ where: { email } });
    if (!verification) throw new NotFoundException('No password reset request found.');

    // Cooldown: 60 seconds
    const now = new Date();
    const secondsSinceLastSend = (now.getTime() - verification.lastSentAt.getTime()) / 1000;
    if (secondsSinceLastSend < 60) throw new BadRequestException('Please wait before requesting a new code.');

    // Generate new secure code
    const newCode = randomInt(100000, 999999).toString();

    // Update record
    await this.prisma.passwordReset.update({
      where: { id: verification.id },
      data: {
        code: newCode,
        attempts: 0, // reset attempts
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        lastSentAt: now,
      },
    });

    // Send new code
    await this.mailService.sendVerificationCode(email, newCode);

    return { message: 'A new verification code has been sent to your email.' };
  }

  
  async signToken(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<{ access_token: string }> {
    const payload = {
      sub: userId,
      email,
      role,
    };
    const jwtSecret = this.config.get<string>('JWT_SECRET');
    const token = await this.jwt.signAsync(payload, {
      expiresIn: '15m',
      secret: jwtSecret,
    });
    return {
      access_token: token,
    };
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
