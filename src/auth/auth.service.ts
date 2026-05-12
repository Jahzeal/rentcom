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
import { AuthDto, AuthDtoSignin, VerifySignupDto, verifyPhoneNumberDto } from './dto';
import * as argon from 'argon2';
import { SocialLoginDto } from './dto/social-login.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { UserRole } from '@prisma/client';
import { randomInt } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mailService: MailService,
  ) {
    this.googleClient = new OAuth2Client(this.config.get<string>('GOOGLE_CLIENT_ID'));
  }

  async verifySocialToken(token: string): Promise<{ email: string; firstName: string; lastName: string; picture?: string }> {
    try {
      // Since we are now using useGoogleLogin on the frontend, we get an access_token
      // We'll use this to fetch the user profile from Google's userinfo endpoint
      const res = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);
      if (!res.ok) throw new BadRequestException('Failed to fetch user info from Google');

      const payload = await res.json();
      if (!payload || !payload.email) throw new BadRequestException('Invalid Google token or email missing');

      return {
        email: payload.email,
        firstName: payload.given_name || payload.name?.split(' ')[0] || '',
        lastName: payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '',
        picture: payload.picture,
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Google token verification failed');
    }
  }

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
        role: dto.role || UserRole.USER,
        Firstname: dto.firstName,
        Lastname: dto.lastName,
        attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min expiry
        lastSentAt: new Date(),
      } as any,
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
        role: verification.role,
        Firstname: (verification as any).Firstname,
        Lastname: (verification as any).Lastname,
        hotelName: verification.role === UserRole.AGENT ? (verification as any).Firstname : null,
        isManagement: verification.role === UserRole.AGENT ? true : false,
      },
    });

    // Cleanup verification record
    await this.prisma.emailVerification.delete({ where: { id: verification.id } });

    // Auto-login after signup (use your existing signToken)
    return this.signToken(user.id, user.email, user.role, user.isManagement);
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
      },
    });
    if (!user) throw new ForbiddenException('Credentials incorrect');
    //if user doesnt exist throw exemptions
    // compare password
    const pdMatches = await argon.verify(user.hash, dto.password);
    if (!pdMatches) throw new ForbiddenException('Credentials incorrect');
    // if pass doesnt incorrect throw exemption
    return this.signToken(user.id, user.email, user.role, user.isManagement);
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
        lastSentAt: new Date(),
      },
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

  async saveNumber(userId: string, phoneNumber: string) {
    const exists = await this.prisma.user.findFirst({
      where: { phoneNumber },
    });

    if (exists) {
      throw new ForbiddenException('Number has already been used');
    }

    const code = randomInt(100000, 999999).toString();

    await this.prisma.phoneNumberVerification.create({
      data: {
        userId,
        phoneNumber,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        lastSentAt: new Date(),
        attempts: 0,
      },
    });

    await this.mailService.sendVerificationCode(phoneNumber, code);

    return { message: 'Verification code sent to your phone.' };
  }


  async verifyPhoneNumber(dto: verifyPhoneNumberDto) {
    const { phonenumber, code } = dto;

    const verification = await this.prisma.phoneNumberVerification.findFirst({
      where: {
        phoneNumber: phonenumber,
        code,
        expiresAt: { gt: new Date() },
      },
    });

    if (!verification) {
      const record = await this.prisma.phoneNumberVerification.findFirst({
        where: { phoneNumber: phonenumber },
      });

      if (record) {
        if (record.attempts + 1 >= 5) {
          await this.prisma.phoneNumberVerification.delete({
            where: { id: record.id },
          });
          throw new ForbiddenException(
            'Too many failed attempts. Please request a new code.',
          );
        }

        await this.prisma.phoneNumberVerification.update({
          where: { id: record.id },
          data: { attempts: { increment: 1 } },
        });
      }

      throw new ForbiddenException('Invalid or expired code');
    }

    //  Update existing user
    const user = await this.prisma.user.update({
      where: { id: verification.userId },
      data: {
        phoneNumber: verification.phoneNumber,
        verified: true,
      },
    });

    // Cleanup
    await this.prisma.phoneNumberVerification.delete({
      where: { id: verification.id },
    });

    return { message: 'Phone number verified successfully' };
  }


  async signToken(
    userId: string,
    email: string,
    role: UserRole,
    isManagement: boolean = false,
  ): Promise<{ access_token: string }> {
    const payload = {
      sub: userId,
      email,
      role,
      isManagement,
    };
    const jwtSecret = this.config.get<string>('JWT_SECRET');
    const token = await this.jwt.signAsync(payload, {
      expiresIn: '1d',
      secret: jwtSecret,
    });
    return {
      access_token: token,
    };
  }
  //social media

  async verifyFacebookToken(token: string): Promise<{ email: string; firstName: string; lastName: string; picture?: string }> {
    try {
      const res = await fetch(`https://graph.facebook.com/me?fields=email,first_name,last_name,picture&access_token=${token}`);
      if (!res.ok) throw new BadRequestException('Failed to fetch user info from Facebook');

      const payload = await res.json();
      if (!payload || !payload.email) throw new BadRequestException('Invalid Facebook token or email missing');

      return {
        email: payload.email,
        firstName: payload.first_name || '',
        lastName: payload.last_name || '',
        picture: payload.picture?.data?.url,
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Facebook token verification failed');
    }
  }

  async socialLogin(dto: SocialLoginDto) {
    // 1. Verify provider token based on provider type
    let profile;
    if (dto.provider === 'google') {
      profile = await this.verifySocialToken(dto.token);
    } else if (dto.provider === 'facebook') {
      profile = await this.verifyFacebookToken(dto.token);
    } else {
      throw new BadRequestException('Unsupported social provider');
    }

    // 2. Check if user exists
    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    // 3. Create user if they don't exist
    if (!user) {
      // For social logins, we generate a random dummy hash since they won't use a password
      const randomPassword = randomInt(10000000, 99999999).toString();
      const hash = await argon.hash(randomPassword);

      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          hash,
          Firstname: profile.firstName,
          Lastname: profile.lastName,
          role: (dto.role as UserRole) || UserRole.USER,
          isManagement: false,
          verified: true, // Social accounts are pre-verified
        },
      });
    }

    // 4. Return signed token
    return this.signToken(user.id, user.email, user.role, user.isManagement);
  }


}
