import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { PropertyType } from '@prisma/client';

export class CreatePropertyDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(PropertyType)
  type: PropertyType;

  @IsNumber()
  price: number;

  @IsString()
  address: string;

  @IsArray()
  images: string[];

  @IsNumber()
  beds: number;

  @IsString()
  typerooms: string;

  @IsNumber()
  baths: number;

  @IsArray()
  amenities: string[];
}
