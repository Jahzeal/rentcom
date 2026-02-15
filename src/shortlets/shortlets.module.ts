import { Module } from '@nestjs/common';
import { ShortletsController, ShortletsAdminController } from './shortlets.controller';
import { ShortletsService } from './shortlets.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [ShortletsController, ShortletsAdminController],
    providers: [ShortletsService],
    exports: [ShortletsService],
})
export class ShortletsModule { }
