import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

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

  @IsString()
  @IsOptional()
  profileImage?: string;

  @IsString()
  @IsOptional()
  currentPassword?: string;

  @IsBoolean()
  @IsOptional()
  emailNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  savedListingsAlerts?: boolean;

  @IsBoolean()
  @IsOptional()
  marketUpdatesAlerts?: boolean;

  @IsBoolean()
  @IsOptional()
  rennantNewsAlerts?: boolean;

  @IsBoolean()
  @IsOptional()
  messagesAlerts?: boolean;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  accountName?: string;

  @IsString()
  @IsOptional()
  accountNumber?: string;
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
