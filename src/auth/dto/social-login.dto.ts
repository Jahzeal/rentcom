/* eslint-disable prettier/prettier */
import { IsNotEmpty, IsString } from "class-validator";

export class SocialLoginDto {
  @IsString()
  @IsNotEmpty()
  token: string;    // idToken, accessToken, identityToken

  @IsString()
  role?: string;

  @IsString()
  @IsNotEmpty()
  provider: string; // 'google', 'facebook'
}
