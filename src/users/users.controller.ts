// src/users/user.controller.ts (Correction)

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { GetUser } from 'src/auth/decorator';
import { JwtGuard } from 'src/auth/guard';
import { editUserDto } from './dto';
import { UsersService } from './users.service'; // 💡 Import the UsersService
import { CreateFavoriteDto } from './dto/favourite.dto';

@UseGuards(JwtGuard)
@Controller('users')
export class UserController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@GetUser() user: User) {
    return user;
  }

  @Patch('update-me')
  // Note: userId MUST be a string (UUID), not number, based on your schema!
  async editUser(@GetUser('id') userId: string, @Body() dto: editUserDto) {
    // 💡 CALL THE SERVICE METHOD
    return this.usersService.editUser(userId, dto);
  }

  @Post('favourite')
  addFavorite(@GetUser('id') userId: string, @Body() dto: CreateFavoriteDto) {
    return this.usersService.addFavorite(userId, dto);
  }

  // Controller: Extracts ID from the URL path.
  @Delete('favourite/:id')
  removeFavorite(
    @GetUser('id') userId: string,
    @Param('id', ParseUUIDPipe) propertyId: string,
  ) {
    return this.usersService.removeFavorite(userId, propertyId);
  }
}
