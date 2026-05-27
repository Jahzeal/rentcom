/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { editUserDto } from '../users/dto/users.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}
  async getStats(agentId?: string) {
    const propertyFilter = agentId ? { userId: agentId, deletedAt: null } : { deletedAt: null };
    const relatedFilter = agentId ? { property: { userId: agentId, deletedAt: null } } : { property: { deletedAt: null } };

    const [
      totalUsers,
      totalProperties,
      rentalCount,
      bookingCount,
      tourStats,
      bookingStats,
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
      this.prisma.booking.groupBy({
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

    const bookings = {
      total: bookingStats.reduce((acc, curr) => acc + curr._count._all, 0),
      confirmed: bookingStats.find((s) => s.status === 'CONFIRMED')?._count._all || 0,
      pending: bookingStats.find((s) => s.status === 'PENDING')?._count._all || 0,
    };

    // --- CALCULATE TRENDS ---
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonth = new Date().getMonth();
    const last6Months: { name: string; value: number }[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const targetMonth = (currentMonth - i + 12) % 12;
      const targetYear = new Date().getFullYear() - (currentMonth - i < 0 ? 1 : 0);
      
      const startDate = new Date(targetYear, targetMonth, 1);
      const endDate = new Date(targetYear, targetMonth + 1, 0);

      const count = await this.prisma.booking.count({
        where: {
          ...relatedFilter,
          createdAt: {
            gte: startDate,
            lte: endDate,
          }
        }
      });

      last6Months.push({ name: months[targetMonth], value: count });
    }

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
      bookings,
      trends: last6Months,
      propertyCounts,
    };
  }

  async getAllUsers() {
    return this.prisma.user.findMany();
  }

  async getAllProperties() {
    return this.prisma.property.findMany({
      where: { deletedAt: null },
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

      // Use Soft Delete for properties to preserve booking/payment history
      return this.prisma.property.update({
        where: { id: propetyId },
        data: { deletedAt: new Date() }
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

  private getUserDisplayName(user: any): string {
    const firstName = user.Firstname?.trim();
    const lastName = user.Lastname?.trim();

    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;
    if (lastName) return lastName;
    if (user.Screenname?.trim()) return user.Screenname.trim();

    return user.email.split('@')[0];
  }

  async getNotifications(user: any) {
    const relatedFilter = user.role === 'AGENT' ? { property: { userId: user.id } } : {};

    const [bookings, tourRequests, unsuccessfulAgents] = await Promise.all([
      this.prisma.booking.findMany({
        where: relatedFilter,
        include: {
          user: true,
          property: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.tourRequest.findMany({
        where: relatedFilter,
        include: {
          user: true,
          property: true,
        },
        orderBy: { requestedAt: 'desc' },
        take: 10,
      }),
      user.role === 'ADMIN' 
        ? this.prisma.user.findMany({
            where: { role: 'AGENT', isManagement: false },
            orderBy: { createdAt: 'desc' },
            take: 10,
          })
        : Promise.resolve([]),
    ]);

    const notifications = [
      ...bookings.map((b: any) => ({
        id: `booking-${b.id}`,
        title: b.status === 'CONFIRMED' ? 'Payment Confirmed' : 'New Booking Request',
        message: `${this.getUserDisplayName(b.user)} booked ${b.property.title}. Status: ${b.status}`,
        amount: b.payments?.[0]?.amount || 0,
        createdAt: b.createdAt,
        read: b.status === 'CONFIRMED',
        type: b.status === 'CONFIRMED' ? 'info' : 'alert',
        email: b.user?.email || null,
        phone: b.user?.phoneNumber || b.user?.phone || null,
      })),
      ...tourRequests.map((t: any) => ({
        id: `tour-${t.id}`,
        title: 'New Tour Request',
        message: `${this.getUserDisplayName(t.user)} requested a tour for ${t.property.title}. Status: ${t.status}`,
        createdAt: t.requestedAt,
        read: t.status === 'COMPLETED',
        type: 'alert',
        email: t.user?.email || null,
        phone: t.user?.phoneNumber || t.user?.phone || null,
      })),
      ...unsuccessfulAgents.map((u: any) => ({
        id: `unsub-${u.id}`,
        title: 'Unsuccessful Subscription',
        message: `${this.getUserDisplayName(u)} signed up as an Agent but did not complete the subscription.`,
        amount: 0,
        createdAt: u.createdAt,
        read: false,
        type: 'subscription',
        email: u.email || null,
        phone: u.phoneNumber || u.phone || null,
      })),
    ];

    return notifications.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async payoutBooking(bookingId: string, proofOfPayment?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId }
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.isPaidOut) throw new BadRequestException('Booking already paid out');

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { 
        isPaidOut: true,
        proofOfPayment: proofOfPayment || null
      } as any
    });
  }
}
