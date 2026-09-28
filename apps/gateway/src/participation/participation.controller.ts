import {
    Controller,
    Get,
    Post,
    Param,
    ParseIntPipe,
    UseGuards,
} from '@nestjs/common';
import { ParticipationService } from './participation.service';
import { User } from '../ms-auth/decorators/user.decorator';
import {
    EventDto,
    MissionDto,
    MyParticipationDto,
    ParticipantDto,
    SlotDto,
} from '@app/contracts';
import { AuthenticatedGuard } from '../ms-auth/guard/authenticated.guard';

@Controller()
export class ParticipationController {
    constructor(private readonly participationService: ParticipationService) {}

    @Post('slots/:id/participate')
    async create(
        @User('id') userId: string,
        @Param('id', ParseIntPipe) slotId: number,
    ): Promise<ParticipantDto> {
        return this.participationService.create(userId, slotId);
    }

    @Get('participations')
    async findAll(): Promise<ParticipantDto[]> {
        return this.participationService.findAll();
    }

    @Get('participations/:id')
    async findOne(
        @Param('id', ParseIntPipe) id: number,
    ): Promise<ParticipantDto> {
        return this.participationService.findOne(id);
    }

    @Get('me/participations')
    @UseGuards(AuthenticatedGuard)
    async getMyParticipations(
        @User('id') userId: string,
    ): Promise<MyParticipationDto[]> {
        return this.participationService.getMyParticipations(userId);
    }

    @Get('me/slots')
    async getMySlots(@User('id') userId: string): Promise<SlotDto[]> {
        return this.participationService.getMySlots(userId);
    }

    @Get('me/missions')
    async getMyMissions(@User('id') userId: string): Promise<MissionDto[]> {
        return this.participationService.getMyMissions(userId);
    }

    @Get('me/events')
    async getMyEvents(
        @User('id') userId: string,
    ): Promise<Omit<EventDto, 'address' | 'missions'>[]> {
        return this.participationService.getMyEvents(userId);
    }

    @Post('participations/:id/accept')
    async accept(
        @User('id') userId: string,
        @Param('id', ParseIntPipe) id: number,
    ): Promise<ParticipantDto> {
        return this.participationService.transition(userId, id, 'ACCEPT');
    }

    @Post('participations/:id/reject')
    async reject(
        @User('id') userId: string,
        @Param('id', ParseIntPipe) id: number,
    ): Promise<ParticipantDto> {
        return this.participationService.transition(userId, id, 'REJECT');
    }

    @Post('participations/:id/cancel')
    async cancel(
        @User('id') userId: string,
        @Param('id', ParseIntPipe) id: number,
    ): Promise<ParticipantDto> {
        return this.participationService.transition(userId, id, 'CANCEL');
    }
}
