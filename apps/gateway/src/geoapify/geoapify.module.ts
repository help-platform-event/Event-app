import { Module } from '@nestjs/common';
import { GeoapifyService } from './geoapify.service';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [ConfigModule],
    providers: [GeoapifyService],
    exports: [GeoapifyService],
})
export class GeoapifyModule {}
