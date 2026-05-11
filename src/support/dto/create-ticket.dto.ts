import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Payment Issue' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  subject: string;

  @ApiProperty({ example: 'I am unable to complete my payment for...' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  message: string;

  @ApiPropertyOptional({ description: 'Logged in user ID' })
  @IsString()
  @IsOptional()
  userId?: string;
}
