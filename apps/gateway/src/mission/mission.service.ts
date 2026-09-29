import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { toMissionDto, toMissionDetails } from './mapper/mission.mapper';
import { prisma } from '@app/db';
import { MissionDetailsDto, MissionDto } from '@app/contracts';
import { missionDetailsQuery } from './query/mission-details.query';
import { missionQuery } from './query/mission.query';

@Injectable()
export class MissionService {
    async create(
        eventId: number,
        createMissionDto: CreateMissionDto,
    ): Promise<MissionDto> {
        const newMission = await prisma.mission.create({
            data: {
                ...createMissionDto,
                Event: { connect: { id: eventId } },
            },
            ...missionQuery,
        });

        return toMissionDto(newMission);
    }

    async findOneById(id: number): Promise<MissionDto> {
        const mission = await prisma.mission.findUnique({
            where: { id },
            ...missionQuery,
        });
        if (!mission) throw new NotFoundException('Mission not found');

        return toMissionDto(mission);
    }

    async findOneWithDetails(
        userId: string,
        missionId: number,
    ): Promise<MissionDetailsDto> {
        const mission = await prisma.mission.findUnique({
            where: { id: missionId },
            ...missionDetailsQuery,
        });

        if (!mission) throw new NotFoundException('Mission not found');

        return toMissionDetails(userId, mission);
    }

    async update(
        userId: string,
        missionId: number,
        updateMissionDto: UpdateMissionDto,
    ): Promise<MissionDto> {
        await this.verifyOwnership(userId, missionId);

        const updatedMission = await prisma.mission.update({
            where: { id: missionId },
            data: updateMissionDto,
            ...missionQuery,
        });
        return toMissionDto(updatedMission);
    }

    async remove(userId: string, missionId: number): Promise<void> {
        await this.verifyOwnership(userId, missionId);

        await prisma.mission.delete({
            where: { id: missionId },
        });
    }

    async verifyOwnership(userId: string, missionId: number): Promise<void> {
        const mission = await prisma.mission.findUnique({
            where: { id: missionId },
            select: {
                Event: {
                    select: {
                        organizer_id: true,
                    },
                },
            },
        });

        if (!mission) throw new NotFoundException('Mission not found');

        if (mission?.Event.organizer_id !== userId)
            throw new ForbiddenException('Not allowed');

        // return mission;
    }
}
