import { Injectable, NotFoundException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStaffDto, CreateHotelRoomDto, UpdateRoomStatusDto, ProcessWalkInDto } from './dto/management.dto';
import * as bcrypt from 'bcrypt';
import { RoomStatus, BookingStatus } from '@prisma/client';

@Injectable()
// Forced update to ensure git picks up the fix for HotelRoom images
export class ManagementService {
  constructor(private prisma: PrismaService) {}

  // --- Staff Management ---
  async createStaff(agentId: string, dto: CreateStaffDto) {
    const existing = await this.prisma.managementStaff.findUnique({
      where: { username: dto.username },
    });
    if (existing) throw new ConflictException('Username already taken');

    const hashedPassword = await bcrypt.hash(dto.passwordHash, 10);

    return this.prisma.managementStaff.create({
      data: {
        agentId,
        name: dto.name,
        username: dto.username,
        password: hashedPassword,
        role: dto.role,
      },
      select: { id: true, name: true, username: true, role: true, createdAt: true },
    });
  }

  async getStaffByAgent(agentId: string) {
    return this.prisma.managementStaff.findMany({
      where: { agentId },
      select: { id: true, name: true, username: true, role: true, createdAt: true },
    });
  }

  async deleteStaff(agentId: string, staffId: string) {
    const staff = await this.prisma.managementStaff.findFirst({
      where: { id: staffId, agentId },
    });
    if (!staff) throw new NotFoundException('Staff not found');

    return this.prisma.managementStaff.delete({ where: { id: staffId } });
  }

  // --- Hotel Room Management ---
  async createHotelRoom(agentId: string, dto: CreateHotelRoomDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create a "Listing" (Property) for this room so it shows up in Rentals/Dashboard
      const property = await tx.property.create({
        data: {
          userId: agentId,
          title: dto.roomName || `Room ${dto.roomNumber}`,
          description: dto.description,
          type: 'HOTEL_ROOM',
          address: 'Hotel Location', // In a real scenario, this would come from the Hotel's profile
          location: 'Hotel Area',
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

      // 2. Create the detailed HotelRoom record
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
        property: { select: { title: true } },
        bookings: {
          where: { 
            status: BookingStatus.CONFIRMED,
            endDate: { gte: new Date() }
          },
          select: { startDate: true, endDate: true, status: true }
        }
      },
    });

    const shortlets = await this.prisma.shortlet.findMany({
      where: { property: { userId: agentId } },
      include: { 
        property: { select: { title: true, id: true } },
        roomOptions: true
      }
    });

    // Map shortlet room options to match the dashboard's expected room format
    const shortletRooms = shortlets.flatMap(s => s.roomOptions.map(ro => ({
      id: ro.id, // Using room option id
      propertyId: s.propertyId,
      roomNumber: ro.name, // Mapping name to number
      roomName: s.property.title,
      category: "Shortlet",
      floor: "N/A",
      price: ro.price,
      status: "AVAILABLE", // Default status for shortlets for now
      bookings: [] // TODO: Integrate shortlet bookings if they are room-specific
    })));

    return [...hotelRooms, ...shortletRooms];
  }

  async updateRoomStatus(agentId: string, roomId: string, dto: UpdateRoomStatusDto) {
    const room = await this.prisma.hotelRoom.findFirst({
      where: { id: roomId, property: { userId: agentId } },
    });
    if (!room) throw new NotFoundException('Room not found');

    return this.prisma.hotelRoom.update({
      where: { id: roomId },
      data: { status: dto.status },
    });
  }

  // --- Transactions ---
  async processWalkIn(staffId: string, dto: ProcessWalkInDto) {
    // 1. Find the room (either HotelRoom or RoomOption)
    let hotelRoom = await this.prisma.hotelRoom.findUnique({
      where: { id: dto.hotelRoomId },
      include: { property: true },
    });

    let propertyId: string;
    let ownerId: string;
    let isHotelRoom = true;

    if (hotelRoom) {
      if (hotelRoom.status !== RoomStatus.AVAILABLE) throw new ConflictException('Room is not available');
      propertyId = hotelRoom.propertyId;
      ownerId = hotelRoom.property.userId || '';
    } else {
      // Check if it's a Shortlet Room Option
      const roomOption = await this.prisma.roomOption.findUnique({
        where: { id: dto.hotelRoomId },
        include: { shortlet: { include: { property: true } } }
      });

      if (!roomOption) throw new NotFoundException('Room not found');
      
      propertyId = roomOption.shortlet.propertyId;
      ownerId = roomOption.shortlet.property.userId || '';
      isHotelRoom = false;
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create a booking record tagged as walk-in
      const booking = await tx.booking.create({
        data: {
          propertyId,
          userId: ownerId, 
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          status: BookingStatus.CONFIRMED,
          notes: `Walk-in Guest: ${dto.customerName} (${dto.customerPhone})`,
          isWalkIn: true,
          processedByStaffId: staffId,
          hotelRoomId: isHotelRoom ? dto.hotelRoomId : null,
          // roomOptionId: !isHotelRoom ? dto.hotelRoomId : null, // If we add this field to schema
          payments: {
            create: {
              userId: ownerId,
              amount: dto.amountPaid,
              status: 'SUCCESS',
              reference: `WALKIN-${Date.now()}`,
            }
          }
        },
      });

      // 2. Lock the room if it's a hotel room
      if (isHotelRoom) {
        await tx.hotelRoom.update({
          where: { id: dto.hotelRoomId },
          data: { status: RoomStatus.OCCUPIED },
        });
      }

      return booking;
    });
  }
}
