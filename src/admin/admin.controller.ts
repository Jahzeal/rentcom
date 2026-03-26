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
@Roles('ADMIN', 'AGENT')
@UseGuards(JwtGuard, RolesGuard) // attach the RolesGuard to all routes in this controller
export class AdminController {
  constructor(private adminService: AdminService) {}
  @Get('adminuser')
  @Roles('ADMIN') // <-- Only admins can access
  getMe(@GetUser() user: User) {
    return user; // JWT payload
  }

  @Get('stats')
  getAdminStats(@GetUser() user: User) {
    const agentId = user.role === 'AGENT' ? user.id : undefined;
    return this.adminService.getStats(agentId);
  }

  @Get('users')
  @Roles('ADMIN')
  getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Get('getAllProperties')
  @Roles('ADMIN')
  getAllProperties() {
    return this.adminService.getAllProperties();
  }

  @Delete('deleteproperty/:id')
  @Roles('ADMIN', 'AGENT')
  deleteProperty(@GetUser() user: User, @GetId('id') propertyId: string) {
    console.log(`property with id ${propertyId} deleted by user ${user.id}`);
    return this.adminService.deleteProperty(user, propertyId);
  }

  @Delete('deleteUser/:id')
  @Roles('ADMIN')
  deleteUser(@GetId('id') userId: string) {
    console.log(`user with id ${userId} deleted`);
    return this.adminService.deleteUser(userId);
  }

  @Get('notifications')
  @Roles('ADMIN', 'AGENT')
  async getNotifications(@GetUser() user: User) {
    return this.adminService.getNotifications(user);
  }

  @Patch('update-user/:id')
  @Roles('ADMIN')
  async editUser(@GetId('id') userId: string, @Body() dto: editUserDto) {
    return this.adminService.editUser(userId, dto);
  }
}
