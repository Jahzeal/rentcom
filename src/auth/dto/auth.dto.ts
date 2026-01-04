/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
import { UserRole } from '@prisma/client';
import {IsEmail, IsNotEmpty, IsString,IsOptional} from 'class-validator'
export class AuthDto{
  @IsEmail()
  @IsNotEmpty()
  email: string;


  @IsString()
  @IsNotEmpty()
  password: string;

  
  @IsString()
  @IsOptional()
  FirstName: string;

  @IsString()
  @IsOptional()
  LastName: string;

  @IsString()
  @IsOptional()
  username: string;

  @IsString()
  @IsOptional()
  phone:     string;
}
export class AuthDtoSignin{
  @IsEmail()
  @IsNotEmpty()
  email: string;

  role?: UserRole;


  @IsString()
  @IsNotEmpty()
  password: string;

  
  @IsString()
  @IsOptional()
  FirstName: string;

  @IsString()
  @IsOptional()
  LastName: string;

  @IsString()
  @IsOptional()
  username: string;

  @IsString()
  @IsOptional()
  phone:     string;
}

export class VerifySignupDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}

