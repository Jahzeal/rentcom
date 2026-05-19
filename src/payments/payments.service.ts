import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * Verifies a Paystack transaction reference with Paystack's servers,
   * then confirms the booking and records the payment in the database.
   *
   * Flow:
   * 1. Find the booking to make sure it exists and isn't already confirmed.
   * 2. Call Paystack's verification API (server-to-server) using the secret key.
   * 3. Check that Paystack says the transaction is "success".
   * 4. Update the Booking status to CONFIRMED.
   * 5. Create a Payment record with the real amount from Paystack.
   * 6. Notify the property agent via WebSocket.
   */
  async confirmPayment(bookingId: string, reference: string) {
    // --- Step 1: Find the booking ---
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            userId: true,
          },
        },
        user: {
          select: {
            id: true,
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
      throw new BadRequestException('This booking has already been confirmed');
    }

    // --- Step 2: Verify the reference with Paystack (server-to-server) ---
    // Per Paystack docs: GET https://api.paystack.co/transaction/verify/:reference
    // Authorization header must use the SECRET KEY (never the public key)
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey || secretKey === 'sk_test_your_secret_key_here') {
      throw new InternalServerErrorException(
        'Paystack secret key is not configured on the server.',
      );
    }

    let paystackData: any;
    try {
      const response = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const result = await response.json();

      if (!result.status) {
        throw new BadRequestException(
          result.message || 'Paystack verification failed',
        );
      }

      paystackData = result.data;
    } catch (err: any) {
      // Only rethrow HTTP-level errors here; BadRequestException is re-thrown as-is
      if (
        err instanceof BadRequestException ||
        err instanceof InternalServerErrorException
      ) {
        throw err;
      }
      throw new InternalServerErrorException(
        'Failed to reach Paystack to verify payment. Please try again.',
      );
    }

    // --- Step 3: Check Paystack transaction status ---
    // Paystack returns status = "success" for completed payments
    if (paystackData.status !== 'success') {
      throw new BadRequestException(
        `Payment was not successful. Paystack status: ${paystackData.status}`,
      );
    }

    // Paystack amounts are in kobo (smallest currency unit), convert back to Naira
    const amountInNaira = paystackData.amount / 100;

    // --- Step 4: Update Booking to CONFIRMED ---
    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED' },
    });

    // --- Step 5: Create the Payment record with real data from Paystack ---
    const payment = await this.prisma.payment.create({
      data: {
        userId: booking.user.id,
        bookingId: booking.id,
        amount: amountInNaira,
        status: 'SUCCESS',
        reference: reference,
      },
    });

    // --- Step 6: Notify the property agent via WebSocket ---
    const agentId = booking.property.userId ?? '';
    this.notificationsGateway.notifyAgentAndAdmins(agentId, {
      bookingId: booking.id,
      userName: `${booking.user.Firstname} ${booking.user.Lastname}`,
      userEmail: booking.user.email,
      propertyTitle: booking.property.title,
      startDate: booking.startDate,
      endDate: booking.endDate,
      amount: amountInNaira,
      reference: reference,
      notes: booking.notes,
    });

    return {
      message: 'Payment verified and booking confirmed successfully',
      booking: updatedBooking,
      payment: payment,
    };
  }
}
