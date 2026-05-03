import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto, CreateHotelRoomDto, UpdateRoomStatusDto, ProcessWalkInDto, UpdateHotelRoomDto } from './dto/management.dto';
import { RoomStatus, BookingStatus } from '@prisma/client';

@Injectable()
// Forced update to ensure git picks up the fix for HotelRoom images
export class ManagementService {
  constructor(private prisma: PrismaService) {}

  // --- Staff Management ---
  async createStaff(agentId: string, dto: CreateStaffDto) {
    return this.prisma.managementStaff.create({
      data: {
        ...dto,
        agentId,
        password: dto.passwordHash, // In real app, hash it
      },
    });
  }

  async getStaffByAgent(agentId: string) {
    return this.prisma.managementStaff.findMany({
      where: { agentId },
    });
  }

  async deleteStaff(agentId: string, staffId: string) {
    return this.prisma.managementStaff.delete({ where: { id: staffId } });
  }

  // --- Hotel Room Management ---
  async createHotelRoom(agentId: string, dto: CreateHotelRoomDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch Agent's profile to get default address/location if not provided in DTO
      const agent = await tx.user.findUnique({
        where: { id: agentId }
      });

      const finalAddress = dto.address || agent?.hotelAddress || 'Hotel Location';
      const finalLocation = dto.location || agent?.hotelLocation || 'Hotel Area';
      const finalCoords = dto.coords || agent?.hotelCoords || null;

      // 2. Create a "Listing" (Property) for this room so it shows up in Rentals/Dashboard
      const property = await tx.property.create({
        data: {
          userId: agentId,
          title: dto.roomName || `Room ${dto.roomNumber}`,
          description: dto.description,
          type: 'HOTEL_ROOM',
          address: finalAddress,
          location: finalLocation,
          coords: finalCoords || undefined,
          price: dto.price,
          beds: 1, 
          baths: 1,
          typerooms: dto.category,
          images: dto.images || [], 
          offers: "",
          amenities: dto.amenities ? {
            connectOrCreate: dto.amenities.split(',').map(name => name.trim()).filter(Boolean).map(name => ({
              where: { name },
              create: { name }
            }))
          } : undefined
        },
      });

      // 3. Create the detailed HotelRoom record
      return tx.hotelRoom.create({
        data: {
          propertyId: property.id,
          roomNumber: dto.roomNumber,
          roomName: dto.roomName,
          category: dto.category,
          floor: dto.floor,
          price: dto.price,
          description: dto.description,
          amenities: dto.amenities,
        },
      });
    });
  }

  async getRoomsByAgent(agentId: string) {
    const hotelRooms = await this.prisma.hotelRoom.findMany({
      where: { property: { userId: agentId } },
      include: { 
        property: { select: { title: true, address: true, location: true, images: true } },
        bookings: {
          where: {
            OR: [
              { startDate: { gte: new Date() } },
              { endDate: { gte: new Date() } }
            ]
          }
        }
      },
    });

    const shortlets = await this.prisma.shortlet.findMany({
      where: { property: { userId: agentId } },
      include: { 
        property: { select: { title: true, address: true, location: true, images: true } },
        roomOptions: true 
      }
    });

    // Merge both into a single room-board format
    const allRooms = [
      ...hotelRooms.map(r => ({
        id: r.id,
        roomNumber: r.roomNumber,
        roomName: r.roomName,
        category: r.category,
        floor: r.floor,
        price: r.price,
        status: r.status,
        bookings: r.bookings.map(b => ({ id: b.id, start: b.startDate, end: b.endDate })),
        type: 'HOTEL_ROOM'
      })),
      ...shortlets.flatMap(s => s.roomOptions.map(opt => ({
        id: opt.id,
        roomNumber: opt.name,
        roomName: s.property.title,
        category: 'Shortlet',
        floor: 'N/A',
        price: opt.price,
        status: 'AVAILABLE', // Shortlet availability is more complex, for now default to available
        bookings: [], // We'd need to fetch bookings for these specific options
        type: 'SHORTLET'
      })))
    ];

    return allRooms;
  }

  async updateRoomStatus(userId: string, roomId: string, dto: UpdateRoomStatusDto) {
    return this.prisma.hotelRoom.update({
      where: { id: roomId },
      data: { status: dto.status },
    });
  }

  // --- Transactions ---
  async processWalkIn(staffId: string, dto: ProcessWalkInDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Check if room is available
      const room = await tx.hotelRoom.findUnique({
        where: { id: dto.hotelRoomId },
        include: { property: true }
      });

      if (!room || room.status !== 'AVAILABLE' || !room.property.userId) {
        throw new Error('Room is not available or owner missing');
      }

      // 2. Create a Booking record
      const booking = await tx.booking.create({
        data: {
          userId: room.property.userId as string, // Link to the agent
          propertyId: room.propertyId,
          hotelRoomId: room.id,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          status: 'CONFIRMED',
          isWalkIn: true,
          processedByStaffId: staffId,
          payments: {
            create: {
              userId: room.property.userId as string,
              amount: dto.amountPaid,
              status: 'SUCCESS',
              reference: `WALKIN-${Date.now()}`,
            }
          }
        },
      });

      // 3. Update room status to OCCUPIED
      await tx.hotelRoom.update({
        where: { id: room.id },
        data: { status: 'OCCUPIED' },
      });

      return booking;
    });
  }

  // --- Room Update/Delete ---
  async updateHotelRoom(userId: string, roomId: string, dto: UpdateHotelRoomDto) {
    const room = await this.prisma.hotelRoom.findUnique({
      where: { id: roomId },
      include: { property: true }
    });

    if (!room || room.property.userId !== userId) {
      throw new Error("Unauthorized or Room not found");
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.property.update({
        where: { id: room.propertyId },
        data: {
          title: dto.roomName || room.roomName || `Room ${dto.roomNumber || room.roomNumber}`,
          description: dto.description,
          price: dto.price,
          typerooms: dto.category,
          images: dto.images,
          address: dto.address,
          location: dto.location,
          coords: dto.coords,
        }
      });

      return tx.hotelRoom.update({
        where: { id: roomId },
        data: {
          roomNumber: dto.roomNumber,
          roomName: dto.roomName,
          category: dto.category,
          floor: dto.floor,
          price: dto.price,
          description: dto.description,
          amenities: dto.amenities,
        }
      });
    });
  }

  async deleteHotelRoom(userId: string, roomId: string) {
    const room = await this.prisma.hotelRoom.findUnique({
      where: { id: roomId },
      include: { property: true }
    });

    if (!room || room.property.userId !== userId) {
      throw new Error("Unauthorized or Room not found");
    }

    return this.prisma.property.delete({
      where: { id: room.propertyId }
    });
  }

  async getHotelProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        hotelName: true,
        hotelAddress: true,
        hotelLocation: true,
        hotelCoords: true
      }
    });
  }

  async updateHotelProfile(userId: string, dto: any) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        hotelName: dto.hotelName,
        hotelAddress: dto.hotelAddress,
        hotelLocation: dto.hotelLocation,
        hotelCoords: dto.hotelCoords,
      }
    });
  }
}
