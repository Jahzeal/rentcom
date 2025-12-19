import {
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
  IsNumber,
  IsObject,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PropertyType } from '@prisma/client';

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

export class PriceRangeDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  min?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  max?: number;
}

export class MoreOptionsDto {
  @IsOptional()
  @IsString()
  keywords?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedPets?: string[];
}
export class FilterPropertyDto {
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @IsOptional()
  @ValidateNested()
  @Type(() => PriceRangeDto)
  price?: PriceRangeDto;

  @IsOptional()
  @IsString()
  roomType?: string;

  @IsOptional()
  @IsString()
  searchLocation?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MoreOptionsDto)
  moreOptions?: MoreOptionsDto;

  // ✅ Pagination
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 12;
}
