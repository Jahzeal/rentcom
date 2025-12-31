import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { JwtGuard } from 'src/auth/guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import type { User } from '@prisma/client';
import { editUserDto } from 'src/users/dto/users.dto';
import { GetId } from './decorators/getid.decorator';

@Controller('admin')
@Roles('ADMIN')
@UseGuards(JwtGuard, RolesGuard) // attach the RolesGuard to all routes in this controller
export class AdminController {
  constructor(private adminService: AdminService) {}
  @Get('adminuser')
  @Roles('ADMIN') // <-- Only admins can access
  getMe(@GetUser() user: User) {
    return user; // JWT payload
  }

  @Get('stats')
  getAdminStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Get('getAllProperties')
  getAllProperties() {
    return this.adminService.getAllProperties();
  }

  @Delete('deleteproperty/:id')
  deleteProperty(@GetId('id') propertyId: string) {
    console.log(`property with id ${propertyId} deleted`);
    return this.adminService.deleteProperty(propertyId);
  }

  @Delete('deleteUser/:id')
  deleteUser(@GetId('id') userId: string) {
    console.log(`user with id ${userId} deleted`);
    return this.adminService.deleteUser(userId);
  }

  @Patch('update-user/:id')
  async editUser(@GetId('id') userId: string, @Body() dto: editUserDto) {
    return this.adminService.editUser(userId, dto);
  }
}
