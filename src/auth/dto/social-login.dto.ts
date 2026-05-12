/* eslint-disable prettier/prettier */
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class SocialLoginDto {
  @IsString()
  @IsNotEmpty()
  token: string;    // idToken, accessToken, identityToken

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsNotEmpty()
  provider: string; // 'google', 'facebook'
}
