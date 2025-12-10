import {
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
  IsNumber,
  IsObject,
} from 'class-validator';
import { PropertyType } from 'generated/prisma/client';

export class rentalsDto {
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
  coords: any;
}

export class FilterpropertyDto {
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @IsOptional()
  @IsObject()
  price?: {
    min: number;
    max: number;
  };

  @IsOptional()
  @IsString()
  roomType?: string;

  @IsOptional()
  @IsString()
  searchLocation?: string;

  @IsOptional()
  @IsObject()
  moreOptions?: {
    keywords?: string;
    selectedPets?: string[];
  };
}
