import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class UploadBedspace {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  HostelName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  decription: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  Price: string;
}
