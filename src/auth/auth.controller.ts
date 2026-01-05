/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto, ResetPasswordDto, VerifySignupDto } from './dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { MailService } from 'src/mail/mail.service';
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService,
    private mailService: MailService
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('signup')
  signUp(@Body() dto: AuthDto) {
    console.log({
      dto
    });
    return this.authService.signup(dto);
  }

  @Post('verify-signup')
  async verifySignup(@Body() dto: VerifySignupDto) {
    return this.authService.verifySignup(dto);
  }

  @Post('resendVerificationCode')
     async resendVerificationCode(@Body('email') email: string) {
    return this.authService.resendVerificationCode(email);
  }

  @Post('signin')
  signIn(@Body() dto: AuthDto) {   // <-- pass the DTO here
    
    return this.authService.signin(dto);
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('verify-forgot-password')
  async verifyForgotPassword(@Body() dto: VerifySignupDto) {
    return this.authService.verifyForgotPasswordCode(dto);
  }

 @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
  return this.authService.resetPassword(
    dto.email,
    dto.code,
    dto.newPassword,
  );
  }




  @Post('social-login')
  socialLogin(@Body() dto: SocialLoginDto) {
    return this.authService.socialLogin(dto);
  }
}
