import { IsEmail, IsOptional, IsString } from 'class-validator';

export class editUserDto {
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

export class RequestTourDto {
  @IsString()
  propertyId: string;
}

export class ApplyForPropertyDto {
  @IsString()
  propertyId: string;
}

export class CancelTour {
  @IsString()
  propertyId: string;
  @IsString()
  tourId: string;
}
