import { IsString, IsNotEmpty, IsEnum, IsOptional, IsInt, IsBoolean, IsArray } from 'class-validator';
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

  @IsString()
  @IsNotEmpty()
  roomNumber: string;

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
}
