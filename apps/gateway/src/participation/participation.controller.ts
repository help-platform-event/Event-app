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
import { MyParticipationDto, ParticipantDto } from '@app/contracts';
import { AuthenticatedGuard } from '../ms-auth/guard/authenticated.guard';

/**
 * Participations. Every route acts for the logged-in user (register, answer a request, cancel,
 * list their own participations): anonymous requests get a 401.
 */
@Controller()
@UseGuards(AuthenticatedGuard)
export class ParticipationController {
    constructor(private readonly participationService: ParticipationService) {}

    @Post('slots/:id/participate')
    async create(
        @User('id') userId: string,
        @Param('id', ParseIntPipe) slotId: number,
    ): Promise<ParticipantDto> {
        return this.participationService.create(userId, slotId);
    }

    @Get('me/participations')
    async getMyParticipations(
        @User('id') userId: string,
    ): Promise<MyParticipationDto[]> {
        return this.participationService.getMyParticipations(userId);
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
