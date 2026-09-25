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
import { SlotService } from './slot.service';
import { CreateSlotDto } from './dto/create-slot.dto';
import { UpdateSlotDto } from './dto/update-slot.dto';
import { User } from '../ms-auth/decorators/user.decorator';
import { AccessToken } from '../ms-auth/decorators/access-token.decorator';
import { SlotDetails, SlotDto } from '@app/contracts';

@Controller()
export class SlotController {
    constructor(private readonly slotService: SlotService) {}

    @Post('missions/:id/slots')
    async create(
        @User('id') userId: string,
        @Param('id', ParseIntPipe) missionId: number,
        @Body() createSlotDto: CreateSlotDto,
    ): Promise<void> {
        return await this.slotService.create(userId, missionId, createSlotDto);
    }

    @Get('slots/:id')
    async findOneById(
        @User('id') userId: string,
        @Param('id', ParseIntPipe) slodId: number,
        @Query('details') details: boolean,
        @AccessToken() accessToken: string,
    ): Promise<SlotDetails | SlotDto> {
        if (details)
            return this.slotService.findOneWithParticipants(
                userId,
                slodId,
                accessToken,
            );
        return this.slotService.findOneById(userId, slodId);
    }

    @Patch('slots/:id')
    update(
        @User('id') userId: string,
        @Param('id', ParseIntPipe) slotId: number,
        @Body() updateSlotDto: UpdateSlotDto,
    ): Promise<void> {
        return this.slotService.update(userId, slotId, updateSlotDto);
    }

    @Delete('slots/:id')
    async remove(
        @User('id') userId: string,
        @Param('id', ParseIntPipe) slotId: number,
    ): Promise<void> {
        return this.slotService.remove(userId, slotId);
    }
}
