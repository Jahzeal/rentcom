// import { Injectable } from '@nestjs/common';
// import { uploadBedspace } from './dto/enscroll';
// import { PrismaService } from 'src/prisma/prisma.service';
// import { Prisma } from '@prisma/client';

// @Injectable()
// export class EnscrollService {
//   constructor(private prisma: PrismaService) {}
//   async uploadBedspace(dto: uploadBedspace) {
//     return await this.prisma.enscroll.create({
//       data: {
//         location: dto.Location,
//         name: dto.Name,
//         description: dto.Description,
//         price: dto.Price as Prisma.InputJsonValue,
//       },
//     });
//   }
// }
