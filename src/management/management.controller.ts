import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ManagementService } from './management.service';
import { CreateStaffDto, CreateHotelRoomDto, UpdateRoomStatusDto, ProcessWalkInDto } from './dto/management.dto';
import { JwtGuard } from '../auth/guard'; // Assuming JwtGuard exists
import { Roles } from '../auth/decorator/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('management')
export class ManagementController {
  constructor(private readonly managementService: ManagementService) {}

  // --- Staff Management (Agent Only) ---
  @UseGuards(JwtGuard)
  @Post('staff')
  createStaff(@Req() req: any, @Body() dto: CreateStaffDto) {
    if (req.user.role !== 'AGENT') throw new Error('Unauthorized');
    return this.managementService.createStaff(req.user.id, dto);
  }

  @UseGuards(JwtGuard)
  @Get('staff')
  getStaff(@Req() req: any) {
    if (req.user.role !== 'AGENT') throw new Error('Unauthorized');
    return this.managementService.getStaffByAgent(req.user.id);
  }

  @UseGuards(JwtGuard)
  @Delete('staff/:id')
  deleteStaff(@Req() req: any, @Param('id') id: string) {
    if (req.user.role !== 'AGENT') throw new Error('Unauthorized');
    return this.managementService.deleteStaff(req.user.id, id);
  }

  // --- Hotel Room Management ---
  @UseGuards(JwtGuard)
  @Post('rooms')
  createRoom(@Req() req: any, @Body() dto: CreateHotelRoomDto) {
    // Both Agent and Manager can create rooms (if allowed)
    return this.managementService.createHotelRoom(req.user.id, dto);
  }

  @UseGuards(JwtGuard)
  @Get('rooms')
  getRooms(@Req() req: any) {
    return this.managementService.getRoomsByAgent(req.user.id);
  }

  @UseGuards(JwtGuard)
  @Patch('rooms/:id/status')
  updateStatus(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateRoomStatusDto) {
    return this.managementService.updateRoomStatus(req.user.id, id, dto);
  }

  // --- Transactions ---
  @UseGuards(JwtGuard)
  @Post('walk-in')
  processWalkIn(@Req() req: any, @Body() dto: ProcessWalkInDto) {
    // req.user here might be the ManagementStaff if we use a specific guard
    // For now assuming we extract staff ID
    return this.managementService.processWalkIn(req.user.id, dto);
  }
}
