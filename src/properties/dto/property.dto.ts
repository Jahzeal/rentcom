import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsEnum,
  IsObject,
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

  @IsArray()
  price: any[]; // <-- Because it's JSON (array of objects)

  @IsString()
  address: string;

  @IsArray()
  @IsString({ each: true })
  images: string[];

  @IsNumber()
  beds: number;

  @IsString()
  typerooms: string;

  @IsNumber()
  baths: number;

  @IsArray()
  amenities: string[];

  @IsString()
  offers: string;

  @IsString()
  location: string;

  @IsObject()
  @IsOptional()
  coords: any;
}

export class EditPropertyDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(PropertyType)
  type: PropertyType;

  @IsArray()
  price: any[]; // <-- Because it's JSON (array of objects)
  @IsString()
  address: string;

  @IsArray()
  @IsString({ each: true })
  images: string[];

  @IsNumber()
  beds: number;

  @IsString()
  typerooms: string;

  @IsNumber()
  baths: number;

  @IsArray()
  amenities: string[];

  @IsObject()
  @IsOptional()
  coords: any;

  @IsString()
  offers: string;

  @IsString()
  location: string;
}
