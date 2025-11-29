// src/users/user.controller.ts (Correction)

import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { GetUser } from 'src/auth/decorator';
import { JwtGuard } from 'src/auth/guard';
import { editUserDto } from './dto';
import { UsersService } from './users.service'; // 💡 Import the UsersService

@UseGuards(JwtGuard)
@Controller('users')
export class UserController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@GetUser() user: User) {
    return user;
  }

  // ... (Removed redundant @UseGuards here as it's at the class level)
  @Patch('update-me')
  // Note: userId MUST be a string (UUID), not number, based on your schema!
  async editUser(@GetUser('id') userId: string, @Body() dto: editUserDto) {
    // 💡 CALL THE SERVICE METHOD
    return this.usersService.editUser(userId, dto);
  }
}
