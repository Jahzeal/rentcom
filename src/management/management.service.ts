import { Injectable, NotFoundException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStaffDto, CreateHotelRoomDto, UpdateRoomStatusDto, ProcessWalkInDto } from './dto/management.dto';
import * as bcrypt from 'bcrypt';
import { Roles } from '../auth/decorator/roles.decorator';
import { RoomStatus, BookingStatus } from '@prisma/client';

@Injectable()
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
          price: { amount: dto.price, currency: 'NGN' } as any,
          beds: 1, // Default for a single room
          baths: 1,
          typerooms: dto.category,
          images: [], // Images would be handled by a separate upload logic or added here
          offers: "",
        },
      });

      // 2. Create the detailed HotelRoom record
      return tx.hotelRoom.create({
        data: {
          ...dto,
          propertyId: property.id, // Link to the newly created property
        },
      });
    });
  }

  async getRoomsByAgent(agentId: string) {
    return this.prisma.hotelRoom.findMany({
      where: { property: { userId: agentId } },
      include: { property: { select: { title: true } } },
    });
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
    const room = await this.prisma.hotelRoom.findUnique({
      where: { id: dto.hotelRoomId },
      include: { property: true },
    });
    if (!room) throw new NotFoundException('Room not found');
    if (room.status !== RoomStatus.AVAILABLE) throw new ConflictException('Room is not available');

    return this.prisma.$transaction(async (tx) => {
      // 1. Create a "Shadow User" or just record details in booking notes for now
      // Better: Create a booking record tagged as walk-in
      const booking = await tx.booking.create({
        data: {
          propertyId: room.propertyId,
          userId: room.property.userId || '', // Tie to owner for now or create a temp user
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          status: BookingStatus.CONFIRMED,
          notes: `Walk-in Guest: ${dto.customerName} (${dto.customerPhone})`,
          isWalkIn: true,
          processedByStaffId: staffId,
          hotelRoomId: room.id,
          payments: {
            create: {
              userId: room.property.userId || '',
              amount: dto.amountPaid,
              status: 'SUCCESS',
              reference: `WALKIN-${Date.now()}`,
            }
          }
        },
      });

      // 2. Lock the room
      await tx.hotelRoom.update({
        where: { id: room.id },
        data: { status: RoomStatus.OCCUPIED },
      });

      return booking;
    });
  }
}
