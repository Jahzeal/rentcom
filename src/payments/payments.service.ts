import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async confirmPayment(bookingId: string, reference: string) {
    // 1. Find the booking and its associated property/agent
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            userId: true, // Agent ID
          },
        },
        user: {
          select: {
            Firstname: true,
            Lastname: true,
            email: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status === 'CONFIRMED') {
      throw new BadRequestException('Booking is already confirmed');
    }

    // 2. Update Booking Status
    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED' },
    });

    // 3. Create/Update Payment Record
    // Note: In a real scenario, we'd verify the reference with a gateway (e.g., Paystack)
    const payment = await this.prisma.payment.create({
      data: {
        userId: booking.userId,
        bookingId: booking.id,
        amount: 0, // In a real scenario, this would come from the gateway
        status: 'SUCCESS',
        reference: reference,
      },
    });

    // 4. Trigger Notification via WebSocket
    const agentId = booking.property.userId ?? '';

    this.notificationsGateway.notifyAgentAndAdmins(agentId, {
      bookingId: booking.id,
      userName: `${booking.user.Firstname} ${booking.user.Lastname}`,
      userEmail: booking.user.email,
      propertyTitle: booking.property.title,
      startDate: booking.startDate,
      endDate: booking.endDate,
      amount: payment.amount,
      reference: reference,
    });

    return {
      message: 'Payment confirmed and booking updated',
      booking: updatedBooking,
      payment: payment,
    };
  }
}
