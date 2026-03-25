import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from 'src/auth/guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/booking.dto';

@UseGuards(JwtGuard, RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Post()
  createBooking(@GetUser('id') userId: string, @Body() dto: CreateBookingDto) {
    return this.bookingsService.createBooking(userId, dto);
  }

  @Get('agent')
  @Roles('AGENT', 'ADMIN')
  getAgentBookings(@GetUser('id') userId: string) {
    return this.bookingsService.getAgentBookings(userId);
  }

  @Get('admin')
  @Roles('ADMIN')
  getAllBookings() {
    return this.bookingsService.getAllBookings();
  }
}
