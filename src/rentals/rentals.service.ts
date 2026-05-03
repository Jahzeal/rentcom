import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FilterPropertyDto } from './Dto/rentals.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class RentalsService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Public method to fetch rentals.
   * Handles filters, search, pagination, and property type.
   */
  async getRentals(dto: FilterPropertyDto = {}) {
    return this.applyFilters(dto);
  }

  /**
   * Private helper that contains filtering and pagination logic.
   */
  private async applyFilters(dto: FilterPropertyDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 12;

    const orFilters: Prisma.PropertyWhereInput[] = [];

    // Location or address search
    if (dto.searchLocation) {
      orFilters.push(
        { location: { contains: dto.searchLocation, mode: 'insensitive' } },
        { address: { contains: dto.searchLocation, mode: 'insensitive' } },
      );
    }

    // Keyword search across title, description, amenities
    if (dto.moreOptions?.keywords) {
      const keyword = dto.moreOptions.keywords;
      orFilters.push(
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        {
          amenities: {
            some: { name: { contains: keyword, mode: 'insensitive' } },
          },
        },
      );
    }

    // Base Prisma where clause
    const whereClause: Prisma.PropertyWhereInput = {
      deletedAt: null, // Site-wide filter for soft-deleted properties
      ...(dto.propertyType && { type: dto.propertyType }),
      ...(dto.roomType && { typerooms: dto.roomType }),
      ...(orFilters.length > 0 && { OR: orFilters }),
      ...(dto.userId && { userId: dto.userId }),
    };

    // Availability Filter (Move-in / Move-out)
    if (dto.moreOptions?.moveInDate && dto.moreOptions?.moveOutDate) {
      const start = new Date(dto.moreOptions.moveInDate);
      const end = new Date(dto.moreOptions.moveOutDate);

      // Exclude properties with overlapping CONFIRMED or PENDING bookings
      whereClause.NOT = {
        bookings: {
          some: {
            status: { in: ['CONFIRMED', 'PENDING'] },
            AND: [
              { startDate: { lt: end } },
              { endDate: { gt: start } }
            ]
          }
        }
      };
    }

    // Fetch paginated properties
    let properties: any[] = await this.prisma.property.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        amenities: true,
        user: { select: { id: true, hotelName: true, hotelAddress: true, hotelLocation: true } },
        shortlet: {
          include: {
            roomOptions: true,
          },
        },
      },
    });

    // Grouping Logic for HOTEL_ROOM
    // If the request is not filtering for a specific hotel owner already
    if (!dto.userId) {
      const consolidated: any[] = [];
      const hotelGroups = new Map<string, any[]>();

      for (const p of properties) {
        if (p.type === 'HOTEL_ROOM' && p.userId) {
          if (!hotelGroups.has(p.userId)) hotelGroups.set(p.userId, []);
          const group = hotelGroups.get(p.userId);
          if (group) group.push(p);
        } else {
          consolidated.push(p);
        }
      }

      // Convert Hotel Groups to Single "Hotel Listings"
      for (const [userId, rooms] of hotelGroups.entries()) {
        const firstRoom = rooms[0];
        const allPrices = rooms.flatMap(r => {
           if (Array.isArray(r.price)) return r.price.map(p => p.price || 0);
           return [];
        }).filter(p => p > 0);

        const minPrice = Math.min(...allPrices);
        const maxPrice = Math.max(...allPrices);

        consolidated.push({
          id: `hotel-${userId}`, // Virtual ID
          isHotelListing: true,
          userId: userId,
          title: firstRoom.user?.hotelName || "Hotel",
          address: firstRoom.user?.hotelAddress || firstRoom.address,
          location: firstRoom.user?.hotelLocation || firstRoom.location,
          images: rooms.flatMap(r => r.images).slice(0, 10), // Collective images
          type: 'HOTEL_ROOM',
          priceRange: { min: minPrice, max: maxPrice },
          totalRooms: rooms.length,
          user: firstRoom.user,
          amenities: Array.from(new Set(rooms.flatMap(r => r.amenities.map(a => a.name)))).map(name => ({ name })),
          description: `Welcome to ${firstRoom.user?.hotelName}. We have ${rooms.length} rooms available for your stay.`
        });
      }
      
      properties = consolidated;
    }

    // JSON price filter (TypeScript-safe)
    if (dto.price?.min !== undefined || dto.price?.max !== undefined) {
      const { min, max } = dto.price;

      properties = properties.filter((property) => {
        const priceJson = property.price;

        if (!Array.isArray(priceJson)) return false;

        return priceJson.some((item): boolean => {
          if (typeof item !== 'object' || item === null) return false;

          // Narrow type to object with optional price
          const priceItem = item as { price?: number };

          if (priceItem.price === undefined) return false;
          if (min !== undefined && priceItem.price < min) return false;
          if (max !== undefined && priceItem.price > max) return false;

          return true;
        });
      });
    }

    // Total count (ignores in-memory price filtering)
    const total = await this.prisma.property.count({
      where: whereClause,
    });

    // Product-ready response
    return {
      data: properties,
      meta: {
        page,
        limit,
        total,
        hasNextPage: page * limit < total,
      },
    };
  }
}
