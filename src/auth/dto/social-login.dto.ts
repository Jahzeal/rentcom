/* eslint-disable prettier/prettier */
import { IsNotEmpty, IsString } from "class-validator";

export class SocialLoginDto {
  @IsString()
  @IsNotEmpty()
  provider: 'google' | 'facebook' | 'apple';

  @IsString()
  @IsNotEmpty()
  token: string;    // idToken, accessToken, identityToken
}
