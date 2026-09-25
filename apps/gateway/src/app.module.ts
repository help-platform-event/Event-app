import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { EventModule } from './event/event.module';

import { AuthModule } from './ms-auth/auth.module';
import { SlotModule } from './slot/slot.module';
import { MissionModule } from './mission/mission.module';
import { ParticipationModule } from './participation/participation.module';
import { GeoapifyModule } from './geoapify/geoapify.module';
import { MsAuthClientModule } from './ms-auth-client/ms-auth-client.module';
import { AuthController } from './ms-auth/auth.controller';
import { HealthController } from './health.controller';
import { HealthModule } from './health.module';
import { SettingsModule } from './settings/settings.module';

@Module({
    imports: [
        MsAuthClientModule,
        ConfigModule.forRoot({ isGlobal: true }),
        EventModule,
        MissionModule,
        AuthModule,
        SlotModule,
        ParticipationModule,
        GeoapifyModule,
        HealthModule,
        SettingsModule,
    ],
    controllers: [AppController, AuthController, HealthController],
    providers: [AppService],
})
export class AppModule {}
