import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { MsNotificationClient } from './ms-notification.client';

@Module({
    controllers: [NotificationController],
    providers: [MsNotificationClient],
})
export class NotificationModule {}
