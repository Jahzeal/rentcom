import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { JwtGuard } from 'src/auth/guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import type { User } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtGuard, RolesGuard) // attach the RolesGuard to all routes in this controller
export class AdminController {
  constructor(private adminService: AdminService) {}
  @Get('adminuser')
  @Roles('ADMIN') // <-- Only admins can access
  getMe(@GetUser() user: User) {
    return user; // JWT payload
  }
}
