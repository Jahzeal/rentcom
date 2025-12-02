import { IsEmail, IsOptional, IsString } from 'class-validator';

export class editadminDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  Firstname?: string;

  @IsString()
  @IsOptional()
  Lastname?: string;

  @IsString()
  @IsOptional()
  password?: string;
}
