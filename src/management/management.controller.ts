import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { ManagementService } from './management.service';
import { CreateStaffDto, CreateHotelRoomDto, UpdateRoomStatusDto, ProcessWalkInDto, UpdateHotelRoomDto, ClockInDto, ClockOutDto } from './dto/management.dto';
import { JwtGuard } from '../auth/guard'; // Assuming JwtGuard exists
import { Roles } from '../auth/decorator/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('management')
export class ManagementController {
  constructor(private readonly managementService: ManagementService) { }

  @UseGuards(JwtGuard)
  @Get('banks')
  getBanks() {
    return this.managementService.getBanks();
  }

  @UseGuards(JwtGuard)
  @Get('resolve-bank')
  resolveBank(
    @Query('account_number') accountNumber: string,
    @Query('bank_code') bankCode: string,
  ) {
    return this.managementService.resolveBank(accountNumber, bankCode);
  }

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

  @UseGuards(JwtGuard)
  @Patch('rooms/:id')
  updateRoom(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateHotelRoomDto) {
    return this.managementService.updateHotelRoom(req.user.id, id, dto);
  }

  @UseGuards(JwtGuard)
  @Get('rooms/:id')
  getRoom(@Req() req: any, @Param('id') id: string) {
    return this.managementService.getRoomById(req.user.id, id);
  }

  @UseGuards(JwtGuard)
  @Delete('rooms/:id')
  deleteRoom(@Req() req: any, @Param('id') id: string) {
    return this.managementService.deleteHotelRoom(req.user.id, id);
  }

  @UseGuards(JwtGuard)
  @Get('profile')
  getProfile(@Req() req: any) {
    return this.managementService.getHotelProfile(req.user.id);
  }

  @UseGuards(JwtGuard)
  @Get('reports')
  getReports(@Req() req: any) {
    return this.managementService.getReports(req.user.id);
  }

  @UseGuards(JwtGuard)
  @Patch('profile')
  updateProfile(@Req() req: any, @Body() dto: any) {
    return this.managementService.updateHotelProfile(req.user.id, dto);
  }

  // --- Transactions ---
  @UseGuards(JwtGuard)
  @Post('walk-in')
  processWalkIn(@Req() req: any, @Body() dto: ProcessWalkInDto) {
    return this.managementService.processWalkIn(req.user.id, dto);
  }

  @UseGuards(JwtGuard)
  @Post('bookings/:id/checkout')
  checkout(@Req() req: any, @Param('id') id: string) {
    return this.managementService.checkoutBooking(req.user.id, id);
  }

  @UseGuards(JwtGuard)
  @Get('bookings')
  getBookings(@Req() req: any) {
    return this.managementService.getBookings(req.user.id);
  }

  @UseGuards(JwtGuard)
  @Get('transactions')
  getTransactions(@Req() req: any) {
    return this.managementService.getTransactions(req.user.id);
  }

  // --- Shifts & Presence ---
  @Post('shifts/clock-in')
  clockIn(@Body() dto: ClockInDto) {
    return this.managementService.clockIn(dto);
  }

  @Post('shifts/clock-out')
  clockOut(@Body() dto: ClockOutDto) {
    return this.managementService.clockOut(dto);
  }

  @UseGuards(JwtGuard)
  @Get('staff/presence')
  getPresence(@Req() req: any) {
    return this.managementService.getPresence(req.user.id);
  }
}
