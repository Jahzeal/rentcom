import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from 'src/auth/guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/booking.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @UseGuards(JwtGuard, RolesGuard)
  @Post()
  createBooking(@GetUser('id') userId: string, @Body() dto: CreateBookingDto) {
    return this.bookingsService.createBooking(userId, dto);
  }

  @Post('check-availability')
  checkAvailability(@Body() dto: CreateBookingDto) {
    return this.bookingsService.checkAvailability(dto);
  }

  @Get('property/:id/reserved-dates')
  getReservedDates(@Param('id') id: string) {
    return this.bookingsService.getReservedDates(id);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Get('agent')
  @Roles('AGENT', 'ADMIN')
  getAgentBookings(@GetUser('id') userId: string) {
    return this.bookingsService.getAgentBookings(userId);
  }

  @UseGuards(JwtGuard)
  @Get('user')
  getUserBookings(@GetUser('id') userId: string) {
    return this.bookingsService.getUserBookings(userId);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Get('admin')
  @Roles('ADMIN')
  getAllBookings() {
    return this.bookingsService.getAllBookings();
  }
}
