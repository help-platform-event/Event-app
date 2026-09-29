import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    ParseIntPipe,
    NotFoundException,
    ForbiddenException,
    Query,
} from '@nestjs/common';
import { MissionService } from './mission.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { EventService } from '../event/event.service';
import { User } from '../ms-auth/decorators/user.decorator';
import { MissionDetailsDto, MissionDto } from '@app/contracts';

@Controller()
export class MissionController {
    constructor(
        private readonly missionService: MissionService,
        private readonly eventService: EventService,
    ) {}

    @Post('events/:event_id/missions')
    async create(
        @User('id') userId: string,
        @Param('event_id', ParseIntPipe) eventId: number,
        @Body() createMissionDto: CreateMissionDto,
    ): Promise<MissionDto> {
        const event = await this.eventService.findOne(eventId);

        if (!event) throw new NotFoundException('Event not found');

        if (event.organizer_id !== userId)
            throw new ForbiddenException("You're not allowed");

        return this.missionService.create(eventId, createMissionDto);
    }

    @Get('missions/:id')
    async findOneById(
        @User('id') userId: string,
        @Param('id', ParseIntPipe) missionId: number,
        @Query('details') details?: boolean,
    ): Promise<MissionDto | MissionDetailsDto> {
        if (details)
            return await this.missionService.findOneWithDetails(
                userId,
                missionId,
            );

        return await this.missionService.findOneById(missionId);
    }

    @Patch('missions/:id')
    async update(
        @User('id') userId: string,
        @Param('id', ParseIntPipe) missionId: number,
        @Body() updateMissionDto: UpdateMissionDto,
    ): Promise<MissionDto> {
        return this.missionService.update(userId, missionId, updateMissionDto);
    }

    @Delete('missions/:id')
    async remove(
        @User('id') userId: string,
        @Param('id', ParseIntPipe) missionId: number,
    ): Promise<void> {
        return this.missionService.remove(userId, missionId);
    }
}
