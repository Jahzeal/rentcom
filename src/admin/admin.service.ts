/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { editUserDto } from '../users/dto/users.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}
  async getStats() {
    const [
      totalUsers,
      totalProperties,
      rentalCount,
      bookingCount,
      tourStats,
      propertyTypeStats,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.property.count(),
      this.prisma.rental.count(),
      this.prisma.booking.count(),
      this.prisma.tourRequest.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.property.groupBy({
        by: ['type'],
        _count: { _all: true },
      }),
    ]);

    // Format metrics for the dashboard
    const tours = {
      total: tourStats.reduce((acc, curr) => acc + curr._count._all, 0),
      done: tourStats.find((s) => s.status === 'COMPLETED')?._count._all || 0,
      pending: tourStats.find((s) => s.status === 'PENDING')?._count._all || 0,
    };

    const propertyCounts = {
      shortlets: propertyTypeStats.find((s) => s.type === 'ShortLET')?._count._all || 0,
      hostels: propertyTypeStats.find((s) => s.type === 'Hostels')?._count._all || 0,
      houses: propertyTypeStats.find((s) => s.type === 'APARTMENT')?._count._all || 0,
    };

    return {
      totalUsers,
      totalProperties,
      rentalCount,
      bookingCount,
      tours,
      propertyCounts,
    };
  }

  async getAllUsers() {
    return this.prisma.user.findMany();
  }

  async getAllProperties() {
    return this.prisma.property.findMany({
      include: {
        amenities: true,
      },
    });
  }

  async deleteProperty(propetyId: string) {
    try {
      return this.prisma.property.delete({
        where: { id: propetyId },
      });
    } catch (error) {
      // Prisma throws P2025 if record doesn't exist
      if (error.code === 'P2025') {
        console.log('property not found');
        throw new NotFoundException('Property not found');
      }
      throw error;
    }
  }
  async deleteUser(userId: string) {
    try {
      return this.prisma.user.delete({
        where: { id: userId },
      });
    } catch (error) {
      // Prisma throws P2025 if record doesn't exist
      if (error.code === 'P2025') {
        console.log('user not found');
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }
  async editUser(userId: string, dto: editUserDto) {
    const data: any = { ...dto };
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data,
      });
    } catch (error) {
      // Prisma throws P2025 if record doesn't exist
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }
}
