import { Injectable } from '@nestjs/common';
import { UploadBedspace } from './dto/enscroll';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class EnscrollService {
  constructor(private prisma: PrismaService) { }
  async uploadBedspace(userId: string, dto: UploadBedspace) {
    return await this.prisma.enscroll.create({
      data: {
        address: dto.address,
        HostelName: dto.HostelName,
        decription: dto.decription,
        price: parseInt(dto.Price),
        userId: userId,
        verified: false,
      },
    });
  }

  async getBedspace() {
    return await this.prisma.enscroll.findMany({
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
}
