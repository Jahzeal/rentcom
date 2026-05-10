import { IsString, IsNotEmpty, IsEnum, IsOptional, IsInt, IsBoolean, IsArray, IsObject } from 'class-validator';
// Forced update to ensure git picks up the fix for IsArray
import { StaffRole, RoomStatus } from '@prisma/client';

export class CreateStaffDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  passwordHash: string;

  @IsEnum(StaffRole)
  @IsOptional()
  role?: StaffRole;
}

export class CreateHotelRoomDto {
  @IsString()
  @IsOptional()
  propertyId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roomNumbers?: string[];

  @IsString()
  @IsOptional()
  roomNumber?: string;

  @IsString()
  @IsOptional()
  roomName?: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsOptional()
  floor?: string;

  @IsInt()
  @IsNotEmpty()
  price: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  amenities?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsObject()
  @IsOptional()
  coords?: any;
}

export class UpdateRoomStatusDto {
  @IsEnum(RoomStatus)
  status: RoomStatus;
}

export class ProcessWalkInDto {
  @IsString()
  @IsNotEmpty()
  hotelRoomId: string;

  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @IsInt()
  @IsNotEmpty()
  amountPaid: number;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  staffId?: string;
}

export class UpdateHotelRoomDto {
  @IsString()
  @IsOptional()
  roomNumber?: string;

  @IsString()
  @IsOptional()
  roomName?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  floor?: string;

  @IsInt()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  amenities?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsObject()
  @IsOptional()
  coords?: any;
}
export class ClockInDto {
  @IsString()
  @IsNotEmpty()
  staffId: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ClockOutDto {
  @IsString()
  @IsNotEmpty()
  staffId: string;
}
