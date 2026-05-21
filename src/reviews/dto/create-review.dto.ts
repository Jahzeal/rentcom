import { IsNotEmpty, IsString, IsInt, Min, Max, IsOptional } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  rating: number;

  @IsString()
  @IsNotEmpty()
  comment: string;
}
