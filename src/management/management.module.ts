import { Module } from '@nestjs/common';
import { ManagementService } from './management.service';
import { ManagementController } from './management.controller';

@Module({
  controllers: [ManagementController],
  providers: [ManagementService],
})
export class ManagementModule {}
