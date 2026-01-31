import { Module } from '@nestjs/common';
import { EnscrollController } from './enscroll.controller';
import { EnscrollService } from './enscroll.service';

@Module({
    controllers: [EnscrollController],
    providers: [EnscrollService],
})
export class EnscrollModule { }
