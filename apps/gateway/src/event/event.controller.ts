import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    ParseIntPipe,
    Query,
} from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventFiltersDto } from './dto/event-filters.dto';
import { PublicUser, User } from '../ms-auth/decorators/user.decorator';
import { Public } from '../ms-auth/decorators/public.decorator';
import { AccessToken } from '../ms-auth/decorators/access-token.decorator';
import { EventDto, EventWithAddress, PaginatedEventsDto } from '@app/contracts';

@Controller('events')
export class EventController {
    constructor(private readonly eventService: EventService) {}

    @Post()
    async create(
        @Body() createEventDTO: CreateEventDto,
        @User('id') userId: string,
        @AccessToken() accessToken: string,
    ): Promise<EventWithAddress> {
        return this.eventService.create(createEventDTO, userId, accessToken);
    }

    @Public()
    @Get()
    async findAll(
        @Query() filters?: EventFiltersDto,
    ): Promise<PaginatedEventsDto> {
        return this.eventService.findAll(filters);
    }

    @Get('my-events')
    async findMyAll(
        @User('id') userId: string,
        @AccessToken() accessToken: string,
    ): Promise<EventWithAddress[]> {
        return await this.eventService.findAllMyEvents(userId, accessToken);
    }

    @Public()
    @Get(':id')
    async findOne(
        @Param('id', ParseIntPipe) eventId: number,
        @PublicUser('id') userId?: string,
        @Query('details') details?: boolean,
    ): Promise<EventWithAddress | EventDto> {
        if (details)
            return this.eventService.findOneWithRelation(eventId, userId);

        return this.eventService.findOne(eventId);
    }

    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() updateEventDto: UpdateEventDto,
        @User('id') userId: string,
        @AccessToken() accessToken: string,
    ): Promise<EventWithAddress> {
        return this.eventService.update(
            +id,
            updateEventDto,
            userId,
            accessToken,
        );
    }

    @Patch(':id/cancel')
    async cancel(@Param('id') id: string, @User('id') userId: string) {
        return this.eventService.cancel(+id, userId);
    }

    @Delete(':id')
    async remove(
        @Param('id') id: string,
        @User('id') userId: string,
    ): Promise<void> {
        return this.eventService.remove(+id, userId);
    }
}
