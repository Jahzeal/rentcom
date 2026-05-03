import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto, CreateHotelRoomDto, UpdateRoomStatusDto, ProcessWalkInDto, UpdateHotelRoomDto } from './dto/management.dto';
import { RoomStatus, BookingStatus } from '@prisma/client';

@Injectable()
export class ManagementService {
  constructor(private prisma: PrismaService) {}

  // Helper to verify if a user (Agent or Staff) has access to a property
  private async verifyAccess(userId: string, propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { userId: true }
    });

    if (!property) return false;

    // Case 1: The user is the Agent who owns the property
    if (property.userId === userId) return true;

    // Case 2: The user is a Staff member working for the Agent who owns the property
    const staff = await this.prisma.managementStaff.findUnique({
      where: { id: userId },
      select: { agentId: true }
    });

    if (staff && staff.agentId === property.userId) return true;

    return false;
  }

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
  async createHotelRoom(userId: string, dto: CreateHotelRoomDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Identify the Agent (could be the user or the staff's boss)
      let agentId = userId;
      const staff = await tx.managementStaff.findUnique({ where: { id: userId } });
      if (staff) agentId = staff.agentId;

      const agent = await tx.user.findUnique({ where: { id: agentId } });

      const finalAddress = dto.address || agent?.hotelAddress || 'Hotel Location';
      const finalLocation = dto.location || agent?.hotelLocation || 'Hotel Area';
      const finalCoords = dto.coords || agent?.hotelCoords || null;

      // 2. Create a "Listing" (Property) for this room
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

  async getRoomsByAgent(userId: string) {
    let agentId = userId;
    const staff = await this.prisma.managementStaff.findUnique({ where: { id: userId } });
    if (staff) agentId = staff.agentId;

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
        status: 'AVAILABLE',
        bookings: [],
        type: 'SHORTLET'
      })))
    ];

    return allRooms;
  }

  async updateRoomStatus(userId: string, roomId: string, dto: UpdateRoomStatusDto) {
    const room = await this.prisma.hotelRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException(`Room with ID ${roomId} not found`);
    
    const hasAccess = await this.verifyAccess(userId, room.propertyId);
    if (!hasAccess) throw new ForbiddenException("You do not have permission to modify this room");

    return this.prisma.hotelRoom.update({
      where: { id: roomId },
      data: { status: dto.status },
    });
  }

  // --- Transactions ---
  async processWalkIn(staffId: string, dto: ProcessWalkInDto) {
    return this.prisma.$transaction(async (tx) => {
      const room = await tx.hotelRoom.findUnique({
        where: { id: dto.hotelRoomId },
        include: { property: true }
      });

      if (!room) throw new NotFoundException("Room not found");
      if (room.status !== 'AVAILABLE') throw new BadRequestException("Room is not available for booking");
      if (!room.property.userId) throw new BadRequestException("Property owner missing");

      const booking = await tx.booking.create({
        data: {
          userId: room.property.userId as string,
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

    if (!room) throw new NotFoundException(`Room with ID ${roomId} not found`);
    
    const hasAccess = await this.verifyAccess(userId, room.propertyId);
    if (!hasAccess) throw new ForbiddenException("Unauthorized access to this room");

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
    console.log(`Attempting to delete room/shortlet: ${roomId} by user: ${userId}`);
    
    // 1. Check if it's a HotelRoom
    const hotelRoom = await this.prisma.hotelRoom.findUnique({
      where: { id: roomId },
      include: { property: true }
    });

    if (hotelRoom) {
      const hasAccess = await this.verifyAccess(userId, hotelRoom.propertyId);
      if (!hasAccess) throw new ForbiddenException("You do not have permission to delete this room");
      return this.prisma.property.delete({ where: { id: hotelRoom.propertyId } });
    }

    // 2. Check if it's a ShortletOption
    const shortletOption = await this.prisma.shortletOption.findUnique({
      where: { id: roomId },
      include: { shortlet: { include: { property: true } } }
    });

    if (shortletOption) {
      const hasAccess = await this.verifyAccess(userId, shortletOption.shortlet.propertyId);
      if (!hasAccess) throw new ForbiddenException("You do not have permission to delete this shortlet option");
      
      // If it's the only option, delete the whole property. Otherwise just the option.
      const optionCount = await this.prisma.shortletOption.count({ where: { shortletId: shortletOption.shortletId } });
      if (optionCount <= 1) {
        return this.prisma.property.delete({ where: { id: shortletOption.shortlet.propertyId } });
      } else {
        return this.prisma.shortletOption.delete({ where: { id: roomId } });
      }
    }

    // 3. Fallback: check Property directly
    const prop = await this.prisma.property.findUnique({ where: { id: roomId } });
    if (prop) {
      if (prop.userId !== userId) throw new ForbiddenException("Unauthorized");
      return this.prisma.property.delete({ where: { id: roomId } });
    }

    throw new NotFoundException(`Room, Option, or Property with ID ${roomId} not found`);
  }

  async getHotelProfile(userId: string) {
    let agentId = userId;
    const staff = await this.prisma.managementStaff.findUnique({ where: { id: userId } });
    if (staff) agentId = staff.agentId;

    return this.prisma.user.findUnique({
      where: { id: agentId },
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
