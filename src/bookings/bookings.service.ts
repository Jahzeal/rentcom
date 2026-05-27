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

  async getReservedDates(propertyId: string, category?: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { type: true },
    });

    if (!property) return [];

    if (property.type === 'HOTEL_ROOM' && category) {
      const rooms = await this.prisma.hotelRoom.findMany({
        where: {
          propertyId,
          category,
          NOT: { status: 'MAINTENANCE' },
        },
        select: { id: true },
      });

      const totalRooms = rooms.length;
      if (totalRooms === 0) return [];

      const bookings = await this.prisma.booking.findMany({
        where: {
          propertyId,
          hotelRoomId: { in: rooms.map(r => r.id) },
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
        select: {
          startDate: true,
          endDate: true,
        },
      });

      const dayCounts: Record<string, number> = {};
      for (const booking of bookings) {
        const start = new Date(booking.startDate);
        const end = new Date(booking.endDate);
        
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          dayCounts[dateStr] = (dayCounts[dateStr] || 0) + 1;
        }
      }

      const reservedRanges: { startDate: string; endDate: string }[] = [];
      for (const [dateStr, count] of Object.entries(dayCounts)) {
        if (count >= totalRooms) {
          const nextDay = new Date(dateStr);
          nextDay.setDate(nextDay.getDate() + 1);
          
          reservedRanges.push({
            startDate: new Date(dateStr).toISOString(),
            endDate: nextDay.toISOString(),
          });
        }
      }

      return reservedRanges;
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        propertyId,
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
      select: {
        startDate: true,
        endDate: true,
      },
    });
    return bookings;
  }

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
          NOT: { status: 'MAINTENANCE' },
          bookings: {
            none: {
              status: { in: ['CONFIRMED', 'PENDING'] },
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
            category: { not: roomType },
            NOT: { status: 'MAINTENANCE' },
            bookings: {
              none: {
                status: { in: ['CONFIRMED', 'PENDING'] },
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
            status: { in: ['CONFIRMED', 'PENDING'] },
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
          NOT: { status: 'MAINTENANCE' },
          bookings: {
            none: {
              status: { in: ['CONFIRMED', 'PENDING'] },
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
            category: { not: dto.roomType },
            NOT: { status: 'MAINTENANCE' },
            bookings: {
              none: {
                status: { in: ['CONFIRMED', 'PENDING'] },
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

  async getUserBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: {
        userId: userId,
      },
      include: {
        property: true,
        payments: true,
        hotelRoom: true,
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
              select: { 
                id: true,
                hotelName: true,
                isManagement: true 
              }
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
