import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/auth/guard';
import { PaymentsService } from './payments.service';

@UseGuards(JwtGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('confirm')
  confirmPayment(
    @Body('bookingId') bookingId: string,
    @Body('reference') reference: string,
  ) {
    return this.paymentsService.confirmPayment(bookingId, reference);
  }
}
