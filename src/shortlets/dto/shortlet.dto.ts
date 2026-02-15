import {
    IsString,
    IsNumber,
    IsArray,
    IsOptional,
    ValidateNested,
    IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoomOptionDto {
    @IsString()
    name: string;

    @IsNumber()
    beds: number;

    @IsNumber()
    price: number;

    @IsString()
    description: string;

    @IsArray()
    @IsString({ each: true })
    amenities: string[];

    @IsArray()
    @IsString({ each: true })
    images: string[];
}

export class UpdateRoomOptionDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsNumber()
    beds?: number;

    @IsOptional()
    @IsNumber()
    price?: number;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    amenities?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    images?: string[];
}

export class CreateShortletDto {
    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsString()
    address: string;

    @IsString()
    location: string;

    @IsObject()
    coords: any;

    @IsArray()
    @IsString({ each: true })
    images: string[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateRoomOptionDto)
    roomOptions: CreateRoomOptionDto[];

    @IsOptional()
    @IsString()
    offers?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    amenities?: string[];
}

export class UpdateShortletDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    location?: string;

    @IsOptional()
    @IsObject()
    coords?: any;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    images?: string[];

    @IsOptional()
    @IsString()
    offers?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    amenities?: string[];
}
