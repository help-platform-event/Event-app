import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventModule } from './event/event.module';

import { AuthModule } from './ms-auth/auth.module';
import { SlotModule } from './slot/slot.module';
import { MissionModule } from './mission/mission.module';
import { ParticipationModule } from './participation/participation.module';
import { GeoapifyModule } from './geoapify/geoapify.module';
import { MsAuthClientModule } from './ms-auth-client/ms-auth-client.module';
import { HealthModule } from './health.module';
import { SettingsModule } from './settings/settings.module';
import { KafkaModule } from './kafka/kafka.module';
import { NotificationModule } from './notification/notification.module';

@Module({
    imports: [
        MsAuthClientModule,
        KafkaModule,
        ConfigModule.forRoot({ isGlobal: true }),
        EventModule,
        MissionModule,
        AuthModule,
        SlotModule,
        ParticipationModule,
        GeoapifyModule,
        HealthModule,
        SettingsModule,
        NotificationModule,
    ],
})
export class AppModule {}
