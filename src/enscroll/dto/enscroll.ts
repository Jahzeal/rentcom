import { IsNotEmpty, IsString } from 'class-validator';
export class uploadBedspace {
  @IsString()
  @IsNotEmpty()
  Name: string;

  @IsString()
  @IsNotEmpty()
  Location: string;

  @IsString()
  @IsNotEmpty()
  Description: string;

  @IsString()
  @IsNotEmpty()
  Price: string;
}
