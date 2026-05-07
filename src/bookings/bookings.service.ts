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

  async checkAvailability(dto: CreateBookingDto) {
    const { propertyId, startDate, endDate, roomType } = dto;

    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) throw new NotFoundException('Property not found');

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) throw new BadRequestException('End date must be after start date');

    if (property.type === 'HOTEL_ROOM') {
      const availableRoom = await this.prisma.hotelRoom.findFirst({
        where: {
          propertyId,
          category: roomType,
          status: 'AVAILABLE',
          bookings: {
            none: {
              OR: [
                { AND: [{ startDate: { lte: start } }, { endDate: { gt: start } }] },
                { AND: [{ startDate: { lt: end } }, { endDate: { gte: end } }] },
                { AND: [{ startDate: { gte: start } }, { endDate: { lte: end } }] },
              ],
            },
          },
        },
      });

      if (!availableRoom) {
        const alternatives = await this.prisma.hotelRoom.findMany({
          where: {
            propertyId,
            status: 'AVAILABLE',
            NOT: { category: roomType },
            bookings: {
              none: {
                OR: [
                  { AND: [{ startDate: { lte: start } }, { endDate: { gt: start } }] },
                  { AND: [{ startDate: { lt: end } }, { endDate: { gte: end } }] },
                  { AND: [{ startDate: { gte: start } }, { endDate: { lte: end } }] },
                ],
              },
            },
          },
          select: { category: true, price: true },
          distinct: ['category'],
        });

        if (alternatives.length > 0) {
          const suggestions = alternatives.map(c => `${c.category} (₦${c.price})`).join(', ');
          return {
            available: false,
            message: `${roomType} category is full for these dates.`,
            alternatives: suggestions
          };
        }

        return {
          available: false,
          message: 'The entire hotel is full for these dates.'
        };
      }

      return {
        available: true,
        message: `${roomType} is available!`,
        roomId: availableRoom.id
      };
    }

    // Shortlet logic (assuming single unit for now)
    // Add same overlap check for the propertyId
    const existingBooking = await this.prisma.booking.findFirst({
        where: {
            propertyId,
            OR: [
                { AND: [{ startDate: { lte: start } }, { endDate: { gt: start } }] },
                { AND: [{ startDate: { lt: end } }, { endDate: { gte: end } }] },
                { AND: [{ startDate: { gte: start } }, { endDate: { lte: end } }] },
            ],
        }
    });

    if (existingBooking) {
        return { available: false, message: 'This property is already booked for these dates.' };
    }

    return { available: true, message: 'Property is available!' };
  }

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

    if (property.type !== 'ShortLET' && property.type !== 'HOTEL_ROOM') {
      throw new BadRequestException(
        'Only Shortlet or Hotel properties can be booked directly',
      );
    }

    // 2. Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      throw new BadRequestException('End date must be after start date');
    }

    // 3. Find an available HotelRoom if it's a Hotel property
    let assignedRoomId: string | null = null;
    if (property.type === 'HOTEL_ROOM') {
      // Find a room in the preferred category first
      const availableRoom = await this.prisma.hotelRoom.findFirst({
        where: {
          propertyId: propertyId,
          category: dto.roomType, // Filter by guest's preferred category
          status: 'AVAILABLE',
          bookings: {
            none: {
              OR: [
                {
                  AND: [
                    { startDate: { lte: start } },
                    { endDate: { gt: start } },
                  ],
                },
                {
                  AND: [
                    { startDate: { lt: end } },
                    { endDate: { gte: end } },
                  ],
                },
                {
                  AND: [
                    { startDate: { gte: start } },
                    { endDate: { lte: end } },
                  ],
                },
              ],
            },
          },
        },
      });

      if (!availableRoom) {
        // Find other categories that HAVE availability for these dates
        const otherAvailableCategories = await this.prisma.hotelRoom.findMany({
          where: {
            propertyId: propertyId,
            status: 'AVAILABLE',
            NOT: { category: dto.roomType },
            bookings: {
              none: {
                OR: [
                  {
                    AND: [
                      { startDate: { lte: start } },
                      { endDate: { gt: start } },
                    ],
                  },
                  {
                    AND: [
                      { startDate: { lt: end } },
                      { endDate: { gte: end } },
                    ],
                  },
                  {
                    AND: [
                      { startDate: { gte: start } },
                      { endDate: { lte: end } },
                    ],
                  },
                ],
              },
            },
          },
          select: { category: true, price: true },
          distinct: ['category'],
        });

        if (otherAvailableCategories.length > 0) {
          const suggestions = otherAvailableCategories.map(c => `${c.category} (₦${c.price})`).join(', ');
          throw new BadRequestException(
            `${dto.roomType} category is full for the selected date. Modify your date or check other available categories: ${suggestions}`,
          );
        }

        throw new BadRequestException('The entire hotel is full for the selected date. Please modify your dates.');
      }
      assignedRoomId = availableRoom.id;
    }

    // 4. Create the booking
    const booking = await this.prisma.booking.create({
      data: {
        userId,
        propertyId,
        hotelRoomId: assignedRoomId,
        startDate: start,
        endDate: end,
        status: 'PENDING',
        notes: dto.notes,
      },
      include: {
        property: true,
        hotelRoom: true,
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

    // 5. Create a pending payment record
    await this.prisma.payment.create({
      data: {
        userId,
        bookingId: booking.id,
        amount: dto.amount,
        status: 'PENDING',
        reference: `pending_${booking.id}`,
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
        payments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getAllBookings() {
    return this.prisma.booking.findMany({
      include: {
        property: {
          include: {
            user: {
              select: { hotelName: true }
            }
          }
        },
        user: true,
        payments: true,
        hotelRoom: true,
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
