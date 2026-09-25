import { Module } from '@nestjs/common';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { GeoapifyModule } from '../geoapify/geoapify.module';

@Module({
    imports: [GeoapifyModule],
    controllers: [EventController],
    providers: [EventService],
    exports: [EventService],
})
export class EventModule {}
