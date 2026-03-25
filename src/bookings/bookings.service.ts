import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBookingDto } from './dto/booking.dto';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async createBooking(userId: string, dto: CreateBookingDto) {
    const { propertyId, startDate, endDate, notes } = dto;

    // 1. Check if property exists and is a Shortlet
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { shortlet: true },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.type !== 'ShortLET') {
      throw new BadRequestException('Only Shortlet properties can be booked directly');
    }

    // 2. Validate dates (basic check)
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      throw new BadRequestException('End date must be after start date');
    }

    if (start < new Date()) {
      throw new BadRequestException('Start date cannot be in the past');
    }

    // 3. Create the booking
    const booking = await this.prisma.booking.create({
      data: {
        userId,
        propertyId,
        startDate: start,
        endDate: end,
        status: 'PENDING',
      },
      include: {
        property: true,
        user: {
          select: {
            id: true,
            email: true,
            Firstname: true,
            Lastname: true,
          },
        },
      },
    });

    // 4. Create a pending payment record
    await this.prisma.payment.create({
      data: {
        userId,
        bookingId: booking.id,
        amount: dto.amount,
        status: 'PENDING',
        reference: `pending_${booking.id}`, // Placeholder reference
      },
    });

    return booking;
  }

  async getAgentBookings(agentId: string) {
    return this.prisma.booking.findMany({
      where: {
        property: {
          userId: agentId,
        },
      },
      include: {
        property: true,
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getAllBookings() {
    return this.prisma.booking.findMany({
      include: {
        property: true,
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getBookingById(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: true,
        user: true,
        payments: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }
}
