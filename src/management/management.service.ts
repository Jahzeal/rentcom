import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto, CreateHotelRoomDto, UpdateRoomStatusDto, ProcessWalkInDto, UpdateHotelRoomDto, ClockInDto, ClockOutDto } from './dto/management.dto';
import { RoomStatus, BookingStatus, ShiftStatus } from '@prisma/client';

@Injectable()
export class ManagementService {
  constructor(private prisma: PrismaService) { }

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
    const { passwordHash, ...staffData } = dto;
    return this.prisma.managementStaff.create({
      data: {
        ...staffData,
        agentId,
        password: passwordHash, // In real app, hash it
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

      // Determine room numbers to create
      const roomsToCreate = dto.roomNumbers && dto.roomNumbers.length > 0
        ? dto.roomNumbers
        : [dto.roomNumber || "N/A"];

      // 2. Create a "Listing" (Property) for this category
      const property = await tx.property.create({
        data: {
          userId: agentId,
          title: dto.roomName || `${dto.category} Rooms`,
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

      // 3. Create detailed HotelRoom records for each room number sequentially
      const hotelRooms: any[] = [];
      for (const roomNum of roomsToCreate) {
        const room = await tx.hotelRoom.create({
          data: {
            propertyId: property.id,
            roomNumber: roomNum,
            roomName: dto.roomName,
            category: dto.category,
            floor: dto.floor,
            price: dto.price,
            description: dto.description,
            amenities: dto.amenities,
          },
        });
        hotelRooms.push(room);
      }

      return hotelRooms[0];
    }, {
      timeout: 15000
    });
  }

  async getRoomsByAgent(userId: string) {
    let agentId = userId;
    const staff = await this.prisma.managementStaff.findUnique({ where: { id: userId } });
    if (staff) agentId = staff.agentId;

    const hotelRooms = await this.prisma.hotelRoom.findMany({
      where: {
        property: {
          userId: agentId,
          deletedAt: null // Only show non-deleted rooms
        }
      },
      include: {
        property: { select: { title: true, address: true, location: true, images: true } },
        bookings: {
          where: {
            endDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
          }
        }
      },
    });

    const shortlets = await this.prisma.shortlet.findMany({
      where: {
        property: {
          userId: agentId,
          deletedAt: null
        }
      },
      include: {
        property: {
          select: {
            title: true,
            address: true,
            location: true,
            images: true,
            bookings: true
          }
        },
        roomOptions: true
      }
    });

    const now = new Date();
    const allRooms = [
      ...hotelRooms.map(r => {
        // Find if there's an active booking RIGHT NOW
        const hasActiveBooking = r.bookings.some(b => {
          const start = new Date(b.startDate);
          const end = new Date(b.endDate);
          return now >= start && now <= end;
        });

        // Determine derived status: 
        // 1. If Maintenance, stay Maintenance.
        // 2. If it has an active booking today, it's OCCUPIED.
        // 3. Otherwise, it's AVAILABLE (even if it was manually set to OCCUPIED before).
        let derivedStatus = r.status;
        if (r.status !== 'MAINTENANCE') {
          derivedStatus = hasActiveBooking ? 'OCCUPIED' : 'AVAILABLE';
        }

        return {
          id: r.id,
          roomNumber: r.roomNumber,
          roomName: r.roomName,
          category: r.category,
          floor: r.floor,
          price: r.price,
          status: derivedStatus,
          bookings: r.bookings.map(b => ({ id: b.id, start: b.startDate, end: b.endDate })),
          type: 'HOTEL_ROOM'
        };
      }),
      ...shortlets.flatMap(s => s.roomOptions.map(opt => ({
        id: opt.id,
        shortletId: s.id,
        roomNumber: opt.name,
        roomName: s.property.title,
        category: 'Shortlet',
        floor: 'N/A',
        price: opt.price,
        status: 'AVAILABLE',
        bookings: s.property.bookings.map(b => ({ id: b.id, start: b.startDate, end: b.endDate })),
        type: 'SHORTLET'
      })))
    ];

    return allRooms;
  }

  async getRoomById(userId: string, roomId: string) {
    const room = await this.prisma.hotelRoom.findUnique({
      where: { id: roomId },
      include: {
        property: {
          select: {
            images: true,
            address: true,
            location: true,
            coords: true,
            userId: true,
          }
        }
      }
    });

    if (!room) throw new NotFoundException(`Room with ID ${roomId} not found`);

    const hasAccess = await this.verifyAccess(userId, room.propertyId);
    if (!hasAccess) throw new ForbiddenException("Unauthorized access to this room");

    return {
      id: room.id,
      roomNumber: room.roomNumber,
      roomName: room.roomName,
      category: room.category,
      floor: room.floor,
      price: room.price,
      description: room.description,
      amenities: room.amenities,
      images: room.property.images,
      address: room.property.address,
      location: room.property.location,
      coords: room.property.coords,
    };
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
  async processWalkIn(userId: string, dto: ProcessWalkInDto) {
    return this.prisma.$transaction(async (tx) => {
      const room = await tx.hotelRoom.findUnique({
        where: { id: dto.hotelRoomId },
        include: { property: true }
      });

      if (!room) throw new NotFoundException("Room not found");
      if (room.status !== 'AVAILABLE') throw new BadRequestException("Room is not available for booking");
      if (!room.property.userId) throw new BadRequestException("Property owner missing");

      // 1. Identify the staff member processing this (from DTO or User Context)
      const effectiveStaffId = dto.staffId || userId;
      
      // 2. Verify an active shift exists for this person
      const activeShift = await tx.staffShift.findFirst({
        where: { 
          staffId: effectiveStaffId, 
          status: 'ACTIVE' 
        }
      });

      if (!activeShift) {
        throw new BadRequestException("No active shift found. You must clock in before processing walk-ins.");
      }

      const booking = await tx.booking.create({
        data: {
          userId: room.property.userId as string,
          propertyId: room.propertyId,
          hotelRoomId: room.id,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          status: 'CONFIRMED',
          isWalkIn: true,
          processedByStaffId: effectiveStaffId,
          payments: {
            create: {
              userId: room.property.userId as string,
              amount: dto.amountPaid,
              status: 'SUCCESS',
              reference: dto.reference || `WALKIN-${Date.now()}`,
            }
          }
        },
      });

      await tx.hotelRoom.update({
        where: { id: room.id },
        data: { status: 'OCCUPIED' },
      });

      return booking;
    }, {
      timeout: 15000
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
    }, {
      timeout: 15000
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

      // Use Soft Delete: mark as deleted instead of removing from DB
      return this.prisma.property.update({
        where: { id: hotelRoom.propertyId },
        data: { deletedAt: new Date() }
      });
    }

    // 2. Check if it's a RoomOption (for Shortlets)
    const roomOption = await this.prisma.roomOption.findUnique({
      where: { id: roomId },
      include: { shortlet: { include: { property: true } } }
    });

    if (roomOption) {
      const hasAccess = await this.verifyAccess(userId, roomOption.shortlet.propertyId);
      if (!hasAccess) throw new ForbiddenException("You do not have permission to delete this shortlet option");

      const optionCount = await this.prisma.roomOption.count({ where: { shortletId: roomOption.shortletId } });
      if (optionCount <= 1) {
        // If it's the only option, Soft Delete the whole property
        return this.prisma.property.update({
          where: { id: roomOption.shortlet.propertyId },
          data: { deletedAt: new Date() }
        });
      } else {
        // If there are multiple options, we can actually delete the specific option record 
        return this.prisma.roomOption.delete({ where: { id: roomId } });
      }
    }

    // 3. Fallback: check Property directly
    const prop = await this.prisma.property.findUnique({ where: { id: roomId } });
    if (prop) {
      if (prop.userId !== userId) throw new ForbiddenException("Unauthorized");
      return this.prisma.property.update({
        where: { id: roomId },
        data: { deletedAt: new Date() }
      });
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
        hotelCoords: true,
        hotelCategories: true,
        checkoutTime: true,
        bankName: true,
        accountName: true,
        accountNumber: true
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
        hotelCategories: dto.hotelCategories,
        checkoutTime: dto.checkoutTime,
        bankName: dto.bankName,
        accountName: dto.accountName,
        accountNumber: dto.accountNumber,
      }
    });
  }

  // --- Reports & Analytics ---
  async getReports(userId: string) {
    let agentId = userId;
    const staff = await this.prisma.managementStaff.findUnique({ where: { id: userId } });
    if (staff) agentId = staff.agentId;

    const now = new Date();

    // 1. Fetch all relevant data
    const [payments, bookings, rooms] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          status: 'SUCCESS',
          booking: { property: { userId: agentId, deletedAt: null } }
        },
        include: { booking: { include: { hotelRoom: true } } }
      }),
      this.prisma.booking.findMany({
        where: { property: { userId: agentId, deletedAt: null } },
      }),
      this.prisma.hotelRoom.findMany({
        where: { property: { userId: agentId, deletedAt: null } }
      })
    ]);

    // 2. Calculate KPIs
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalBookings = bookings.length;
    const occupancyRate = rooms.length > 0
      ? (rooms.filter(r => r.status === 'OCCUPIED').length / rooms.length) * 100
      : 0;

    // 3. Monthly Revenue Trend (Last 6 Months)
    const monthlyRevenue: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthLabel = monthStart.toLocaleString('en-US', { month: 'short' });

      const revenue = payments
        .filter(p => p.createdAt >= monthStart && p.createdAt <= monthEnd)
        .reduce((sum, p) => sum + p.amount, 0);

      monthlyRevenue.push({ name: monthLabel, revenue });
    }

    // 4. Revenue by Category
    const categoryStats: Record<string, number> = {};
    payments.forEach(p => {
      const cat = p.booking?.hotelRoom?.category || 'General';
      categoryStats[cat] = (categoryStats[cat] || 0) + p.amount;
    });
    const categoryData = Object.entries(categoryStats).map(([name, value]) => ({ name, value }));

    // 5. Recent Activity
    const recentTransactions = payments
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        amount: p.amount,
        date: p.createdAt,
        room: p.booking?.hotelRoom?.roomNumber || 'N/A',
        status: p.status
      }));

    return {
      kpis: {
        totalRevenue,
        totalBookings,
        occupancyRate: Math.round(occupancyRate),
        activeRooms: rooms.filter(r => r.status === 'AVAILABLE').length,
        totalRooms: rooms.length
      },
      charts: {
        monthlyRevenue,
        categoryData
      },
      recentTransactions
    };
  }

  async checkoutBooking(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { property: true }
    });

    if (!booking) throw new NotFoundException(`Booking with ID ${bookingId} not found`);

    const hasAccess = await this.verifyAccess(userId, booking.propertyId);
    if (!hasAccess) throw new ForbiddenException("Unauthorized access to this booking");

    // Update the booking end date to NOW
    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { 
        endDate: new Date(),
        status: 'CHECKED_OUT'
      },
    });

    // Also reset the room status to AVAILABLE
    if (booking.hotelRoomId) {
      await this.prisma.hotelRoom.update({
        where: { id: booking.hotelRoomId },
        data: { status: 'AVAILABLE' }
      });
    }

    return updatedBooking;
  }

  async getBookings(userId: string) {
    let agentId = userId;
    const staff = await this.prisma.managementStaff.findUnique({ where: { id: userId } });
    if (staff) agentId = staff.agentId;

    return this.prisma.booking.findMany({
      where: { property: { userId: agentId, deletedAt: null } },
      include: {
        hotelRoom: true,
        user: {
          select: {
            Firstname: true,
            Lastname: true,
            email: true,
            phone: true
          }
        },
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getTransactions(userId: string) {
    let agentId = userId;
    const staff = await this.prisma.managementStaff.findUnique({ where: { id: userId } });
    if (staff) agentId = staff.agentId;

    const payments = await this.prisma.payment.findMany({
      where: {
        booking: { property: { userId: agentId, deletedAt: null } }
      },
      include: { booking: { include: { hotelRoom: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return payments.map(p => ({
      id: p.id,
      amount: p.amount,
      date: p.createdAt,
      room: p.booking?.hotelRoom?.roomNumber || 'N/A',
      status: p.status,
      reference: p.reference
    }));
  }

  // --- Shift Tracking & Presence ---
  async clockIn(dto: ClockInDto) {
    const staff = await this.prisma.managementStaff.findUnique({
      where: { id: dto.staffId }
    });

    if (!staff) throw new NotFoundException('Staff member not found');
    
    // Simple password check (in production use bcrypt)
    if (staff.password !== dto.password) {
      throw new ForbiddenException('Invalid staff password');
    }

    // Check if there's already an active shift for this staff member
    const activeShift = await this.prisma.staffShift.findFirst({
      where: { staffId: dto.staffId, status: 'ACTIVE' }
    });

    if (activeShift) {
      // If already clocked in, just return the active shift
      return activeShift;
    }

    return this.prisma.staffShift.create({
      data: {
        staffId: dto.staffId,
        status: 'ACTIVE',
        startTime: new Date()
      }
    });
  }

  async clockOut(dto: ClockOutDto) {
    const activeShift = await this.prisma.staffShift.findFirst({
      where: { staffId: dto.staffId, status: 'ACTIVE' }
    });

    if (!activeShift) {
      throw new BadRequestException('No active shift found for this staff member');
    }

    return this.prisma.staffShift.update({
      where: { id: activeShift.id },
      data: {
        status: 'COMPLETED',
        endTime: new Date()
      }
    });
  }

  async getPresence(userId: string) {
    let agentId = userId;
    const staff = await this.prisma.managementStaff.findUnique({ where: { id: userId } });
    if (staff) agentId = staff.agentId;

    const activeShifts = await this.prisma.staffShift.findMany({
      where: {
        status: 'ACTIVE',
        staff: { agentId: agentId }
      },
      select: { staffId: true }
    });

    return activeShifts.map(s => s.staffId);
  }
}
