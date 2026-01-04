/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module'; // Adjust path as needed
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategy';

@Module({
  imports: [JwtModule.register({}), PrismaModule, MailModule],
  controllers: [AuthController],
  providers: [AuthService,JwtStrategy]
})
export class AuthModule {}