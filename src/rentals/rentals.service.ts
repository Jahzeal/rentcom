import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FilterPropertyDto } from './Dto/rentals.dto';
import { Prisma, BookingStatus, PropertyType, RoomStatus } from '@prisma/client';

@Injectable()
export class RentalsService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Standard rental search - Always returns individual properties.
   */
  async getRentals(dto: FilterPropertyDto = {}) {
    const page = Number(dto.page) || 1;
    const limit = Number(dto.limit) || 12;

    const orFilters: Prisma.PropertyWhereInput[] = [];

    if (dto.searchLocation) {
      orFilters.push(
        { location: { contains: dto.searchLocation, mode: 'insensitive' } },
        { address: { contains: dto.searchLocation, mode: 'insensitive' } },
      );
    }

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

    const whereClause: Prisma.PropertyWhereInput = {
      deletedAt: null,
      ...(dto.propertyType && (dto.propertyType as any) !== 'All types' && { type: dto.propertyType as any }),
      ...(dto.userId && { userId: dto.userId }),
      AND: [
        ...(orFilters.length > 0 ? [{ OR: orFilters }] : []),
        // Availability Filter - ONLY for Guest Search (where no specific userId is targeted)
        ...(dto.startDate && dto.endDate ? [{
          bookings: {
            none: {
              status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
              OR: [
                {
                  startDate: { lte: new Date(dto.endDate) },
                  endDate: { gte: new Date(dto.startDate) },
                }
              ]
            }
          }
        }] : []),
        
        // Strictly Available Filter - ONLY for Guest Search (where no specific userId is targeted)
        ...(!dto.userId ? [{
          OR: [
            { type: { notIn: [PropertyType.HOTEL_ROOM, PropertyType.ShortLET] } },
            { hotelRooms: { some: { status: RoomStatus.AVAILABLE } } },
            { shortlet: { isNot: null } }
          ]
        }] : [])
      ],
    };

    const [data, total] = await Promise.all([
      this.prisma.property.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          amenities: true,
          user: {
            select: {
              id: true,
              hotelName: true,
              hotelAddress: true,
              hotelLocation: true,
              isManagement: true,
              role: true,
            },
          },
          hotelRooms: {
            select: { status: true },
          },
          shortlet: {
            include: {
              roomOptions: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.property.count({ where: whereClause }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        hasNextPage: total > page * limit,
      },
    };
  }

  /**
   * Specialized method for the Landing Page - Groups management inventory by user.
   */
  async getGroupedHotels(dto: FilterPropertyDto = {}) {
    const page = Number(dto.page) || 1;
    const limit = Number(dto.limit) || 12;

    const orFilters: Prisma.PropertyWhereInput[] = [];
    if (dto.searchLocation) {
      orFilters.push(
        { location: { contains: dto.searchLocation, mode: 'insensitive' } },
        { address: { contains: dto.searchLocation, mode: 'insensitive' } },
      );
    }
    if (dto.moreOptions?.keywords) {
      const keyword = dto.moreOptions.keywords;
      orFilters.push(
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      );
    }

    const whereClause: Prisma.PropertyWhereInput = {
      deletedAt: null,
      ...(dto.propertyType && (dto.propertyType as any) !== 'All types' && { type: dto.propertyType as any }),
      ...(dto.userId && { userId: dto.userId }),
      AND: [
        ...(orFilters.length > 0 ? [{ OR: orFilters }] : []),
        // Availability Filter
        ...(dto.startDate && dto.endDate ? [{
          bookings: {
            none: {
              status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
              OR: [
                {
                  startDate: { lte: new Date(dto.endDate) },
                  endDate: { gte: new Date(dto.startDate) },
                }
              ]
            }
          }
        }] : [])
      ],
    };

    // Fetch all properties matching filters to group correctly
    const allProperties = await this.prisma.property.findMany({
      where: {
        ...whereClause,
        OR: [
          { hotelRooms: { some: { status: RoomStatus.AVAILABLE } } },
          { hotelRooms: { none: {} } }
        ]
      },
      include: {
        user: true,
        hotelRooms: { where: { status: RoomStatus.AVAILABLE } },
        shortlet: { include: { roomOptions: true } }
      },
      orderBy: { createdAt: 'desc' },
    });

    const hotelGroups = new Map<string, any[]>();
    const individualListings: any[] = [];

    for (const p of allProperties) {
      // Group if user is management and it's a multi-room type
      if (p.user?.isManagement && (p.type === 'HOTEL_ROOM' || p.type === 'ShortLET') && p.userId) {
        if (!hotelGroups.has(p.userId)) hotelGroups.set(p.userId, []);
        hotelGroups.get(p.userId)?.push(p);
      } else {
        // Individual agent or other property types stay individual
        individualListings.push(p);
      }
    }

    const groupedListings = Array.from(hotelGroups.entries()).map(([userId, rooms]) => {
      const firstRoom = rooms[0];
      
      const allPrices = rooms.flatMap(r => {
        if (r.type === 'ShortLET' && r.shortlet?.roomOptions) {
          return r.shortlet.roomOptions.map(o => Number(o.price));
        }
        const pRaw = r.price as any;
        if (Array.isArray(pRaw)) return pRaw.map(p => Number(p.price) || 0);
        const num = parseFloat(pRaw);
        if (!isNaN(num) && num > 0) return [num];
        return [];
      }).filter(p => !isNaN(p) && p > 0);

      const allBeds = rooms.map(r => r.beds || 1);
      const minBeds = Math.min(...allBeds);
      const maxBeds = Math.max(...allBeds);
      const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
      const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;

      return {
        ...firstRoom,
        id: `hotel-${userId}`,
        isHotelListing: true,
        userId: userId,
        title: firstRoom.user?.hotelName || "Hotel Collection",
        address: firstRoom.user?.hotelAddress || firstRoom.address,
        location: firstRoom.user?.hotelLocation || firstRoom.location,
        images: Array.from(new Set(rooms.flatMap(r => r.images))).slice(0, 10),
        type: rooms.some(r => r.type === 'ShortLET') && rooms.some(r => r.type === 'HOTEL_ROOM') ? 'HOTEL_SHORTLET' : firstRoom.type,
        priceRange: { min: minPrice, max: maxPrice },
        price: minPrice,
        totalRooms: rooms.length,
        beds: minBeds,
        baths: Math.min(...rooms.map(r => r.baths || 1)),
        roomOptions: rooms.map(r => ({
          id: r.id,
          name: r.roomName || r.category || r.title,
          beds: r.beds || 1,
          price: r.price,
          description: r.description
        }))
      };
    });

    const combinedListings = [...groupedListings, ...individualListings];

    // Re-sort by date
    combinedListings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const start = (page - 1) * limit;
    const paginatedListings = combinedListings.slice(start, start + limit);

    return {
      data: paginatedListings,
      meta: {
        page: page,
        limit: limit,
        total: combinedListings.length,
        hasNextPage: combinedListings.length > start + limit
      }
    };
  }

  async getHotelProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        hotelName: true,
        hotelAddress: true,
        hotelLocation: true,
        isManagement: true,
        role: true,
      }
    });

    if (!user || !user.isManagement) {
      throw new Error("Hotel not found or user is not a management account.");
    }

    const rooms = await this.prisma.property.findMany({
      where: {
        userId,
        deletedAt: null,
        type: { in: ['HOTEL_ROOM', 'ShortLET'] },
        OR: [
          { hotelRooms: { some: { status: 'AVAILABLE' } } },
          { hotelRooms: { none: {} } } // Fallback for simple properties
        ]
      },
      include: {
        amenities: true,
        hotelRooms: { 
          where: { status: 'AVAILABLE' },
          select: { status: true } 
        },
        shortlet: { include: { roomOptions: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      profile: {
        id: user.id,
        name: user.hotelName || "Hotel Collection",
        address: user.hotelAddress || "Premium Location",
        location: user.hotelLocation,
      },
      rooms: rooms.map(r => {
        // Use normalized price logic
        let price = 0;
        if (typeof r.price === 'number') price = r.price;
        else if (r.price && typeof r.price === 'object' && (r.price as any).amount) price = (r.price as any).amount;

        return {
          ...r,
          price,
          status: r.hotelRooms?.[0]?.status || 'AVAILABLE'
        };
      }),
      stats: {
        totalRooms: rooms.length,
        availableCount: rooms.filter(r => (r.hotelRooms?.[0]?.status || 'AVAILABLE') === 'AVAILABLE').length
      }
    };
  }
}
