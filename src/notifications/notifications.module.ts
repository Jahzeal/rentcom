import { Module, Global } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { PushNotificationsService } from './push-notifications.service';
import { PushSubscriptionsController } from './push-subscriptions.controller';

@Global()
@Module({
  providers: [NotificationsGateway, PushNotificationsService],
  controllers: [PushSubscriptionsController],
  exports: [NotificationsGateway, PushNotificationsService],
})
export class NotificationsModule {}
