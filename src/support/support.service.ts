import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateTicketDto } from './dto/create-ticket.dto';

@Injectable()
export class SupportService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async createTicket(dto: CreateTicketDto) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone || null,
        subject: dto.subject,
        message: dto.message,
        userId: dto.userId || null,
      },
    });

    // Notify admin
    await this.mailService.sendSupportNotification({
      name: dto.name,
      email: dto.email,
      subject: dto.subject,
      message: dto.message,
    });

    return {
      message: 'Support ticket created successfully',
      ticketId: ticket.id,
    };
  }

  async getAllTickets() {
    return this.prisma.supportTicket.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            Firstname: true,
            Lastname: true,
          },
        },
      },
    });
  }

  async getTicketById(id: string) {
    return this.prisma.supportTicket.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  async updateTicketStatus(id: string, status: any) {
    return this.prisma.supportTicket.update({
      where: { id },
      data: { status },
    });
  }
  
  async getUserTickets(email: string) {
    return this.prisma.supportTicket.findMany({
      where: { email },
      orderBy: { createdAt: 'desc' },
    });
  }
}
