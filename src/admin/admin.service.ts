/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { editUserDto } from '../users/dto/users.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}
  async getStats(agentId?: string) {
    const propertyFilter = agentId ? { userId: agentId } : {};
    const relatedFilter = agentId ? { property: { userId: agentId } } : {};

    const [
      totalUsers,
      totalProperties,
      rentalCount,
      bookingCount,
      tourStats,
      propertyTypeStats,
      agentCustomerCount,
    ] = await Promise.all([
      agentId ? Promise.resolve(0) : this.prisma.user.count(),
      this.prisma.property.count({ where: propertyFilter }),
      this.prisma.rental.count({ where: relatedFilter }),
      this.prisma.booking.count({ where: relatedFilter }),
      this.prisma.tourRequest.groupBy({
        by: ['status'],
        where: relatedFilter,
        _count: { _all: true },
      }),
      this.prisma.property.groupBy({
        by: ['type'],
        where: propertyFilter,
        _count: { _all: true },
      }),
      agentId
        ? this.prisma.tourRequest.groupBy({
            by: ['userId'],
            where: relatedFilter,
            _count: { _all: true },
          })
        : Promise.resolve([]),
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
      totalUsers: agentId ? agentCustomerCount.length : totalUsers,
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

  async deleteProperty(user: any, propetyId: string) {
    try {
      // If agent, ensure they own the property
      if (user.role === 'AGENT') {
        const property = await this.prisma.property.findFirst({
          where: { id: propetyId, userId: user.id },
        });
        if (!property) {
          throw new NotFoundException('Property not found or access denied');
        }
      }

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
