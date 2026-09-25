import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreateSlotDto } from './dto/create-slot.dto';
import { UpdateSlotDto } from './dto/update-slot.dto';
import { SlotMapper } from './dto/mapper/slot.mapper';
import { prisma } from '@app/db';
import { MsAuthClient } from '../ms-auth-client/ms-auth-client.service';
import { SlotDetails, SlotDto } from '@app/contracts';
import { slotWithParticipationStatusQuery } from './query/SlotWithParticipationStatus.query';

type OwnerShipEntity = 'Mission' | 'Slot';

@Injectable()
export class SlotService {
    constructor(private readonly msAuthClient: MsAuthClient) {}
    async create(
        userId: string,
        missionId: number,
        createSlotDto: CreateSlotDto,
    ): Promise<void> {
        await this.checkOwnership('Mission', missionId, userId);

        const eventDates = await prisma.mission.findUnique({
            where: { id: missionId },
            select: {
                Event: {
                    select: {
                        start_date: true,
                        end_date: true,
                    },
                },
            },
        });

        if (!eventDates) throw new NotFoundException('Event not found');

        if (
            new Date(createSlotDto.start_at) < eventDates?.Event.start_date ||
            new Date(createSlotDto.end_at) > eventDates?.Event.end_date
        )
            throw new BadRequestException(
                "Le créneau doit être compris entre les dates de l'évènement",
            );

        if (new Date(createSlotDto.start_at) >= new Date(createSlotDto.end_at))
            throw new BadRequestException('Start date must be before end date');

        await prisma.slot.create({
            data: {
                mission_id: missionId,
                ...createSlotDto,
            },
        });
    }

    /**
     * Récupère un Slot par son ID et calcule le nombre de participants "ACCEPTED".
     *
     * Cette méthode utilise `Promise.all` afin d'exécuter en parallèle :
     * - la récupération du Slot
     * - le comptage des participations "ACCEPTED" associées
     *
     * Les deux requêtes sont indépendantes, donc on peut utiliser Promise.all :
     * - le Slot n'a pas besoin du count pour être récupéré
     * - le count n'a pas besoin du Slot pour être calculé
     *
     * Cela permet de réduire le temps total d'exécution en évitant
     * une exécution séquentielle (slot puis count).
     *
     * Exemple :
     * Sans Promise.all :
     *   slot (5ms) → wait → count (5ms) = 10ms
     *
     * Avec Promise.all :
     *   slot (5ms)
     *   count (5ms)
     *   → exécutés en parallèle = 5ms
     *
     * Attention :
     * Si l'une des promesses échoue, Promise.all échoue entièrement.
     *
     * @param slotId - ID du slot à récupérer
     * @returns SlotDTO enrichi avec currentParticipants (status "ACCEPTED" uniquement)
     * @throws NotFoundException si le slot n'existe pas
     */
    async findOneById(userId: string, slotId: number): Promise<SlotDto> {
        const [slot, currentParticipants] = await Promise.all([
            prisma.slot.findUnique({
                where: { id: slotId },
                ...slotWithParticipationStatusQuery,
            }),
            prisma.participation.count({
                where: { slot_id: slotId, status: 'ACCEPTED' },
            }),
        ]);

        if (!slot) throw new NotFoundException('Slot not found');

        return SlotMapper.toSlotDto(userId, slot, currentParticipants);
    }

    async findOneWithParticipants(
        userId: string,
        slotId: number,
        accessToken: string,
    ): Promise<SlotDetails> {
        const [slot, currentParticipants] = await Promise.all([
            prisma.slot.findUnique({
                where: {
                    id: slotId,
                },
                ...slotWithParticipationStatusQuery,
            }),
            prisma.participation.count({
                where: { slot_id: slotId, status: 'ACCEPTED' },
            }),
        ]);

        if (!slot) throw new NotFoundException('Slot not found');

        const userIds = [...new Set(slot.Participation.map((p) => p.user_id))];

        const participantsProfiles = await this.msAuthClient.getProfiles(
            accessToken,
            userIds,
        );

        const profilesMap = new Map(
            participantsProfiles.map((profile) => [profile.id, profile]),
        );

        const participants = slot.Participation.map((participation) => {
            const profile = profilesMap.get(participation.user_id);

            return {
                slot_id: slot.id,
                id: participation.id,
                status: participation.status,
                user_id: participation.user_id,
                email: profile?.email ?? '',
                first_name: profile?.first_name ?? null,
                last_name: profile?.last_name ?? null,
                avatar_url: profile?.avatar_url ?? null,
            };
        });

        return SlotMapper.toSlotWithParticipations(
            userId,
            slot,
            participants,
            currentParticipants,
        );
    }

    async update(
        userId: string,
        slotId: number,
        updateSlotDto: UpdateSlotDto,
    ): Promise<void> {
        await this.checkOwnership('Slot', slotId, userId);

        const slot = await prisma.slot.findUnique({
            where: { id: slotId },
            select: {
                start_at: true,
                end_at: true,
                Mission: {
                    select: {
                        Event: {
                            select: {
                                start_date: true,
                                end_date: true,
                            },
                        },
                    },
                },
            },
        });

        if (!slot) throw new NotFoundException('Slot not found');

        console.log('Appel de update Slot');

        const { start_date, end_date } = slot.Mission.Event;

        const effectiveStartAt = new Date(
            updateSlotDto.start_at ?? slot.start_at,
        );

        const effectiveEndAt = new Date(updateSlotDto.end_at ?? slot.end_at);

        if (effectiveStartAt < start_date || effectiveEndAt > end_date)
            throw new BadRequestException(
                "Le créneau doit être compris entre les dates de l'évènement",
            );

        await prisma.slot.update({
            where: { id: slotId },
            data: updateSlotDto,
        });
    }

    async remove(userId: string, slotId: number): Promise<void> {
        await this.checkOwnership('Slot', slotId, userId);

        await prisma.slot.delete({ where: { id: slotId } });
    }

    async checkOwnership<T extends OwnerShipEntity>(
        entityType: T,
        id: number,
        userId: string,
    ): Promise<void> {
        if (entityType === 'Mission') {
            const mission = await prisma.mission.findUnique({
                where: { id },
                select: {
                    Event: {
                        select: {
                            organizer_id: true,
                        },
                    },
                },
            });

            if (!mission) throw new NotFoundException('Mission not found');

            if (mission.Event.organizer_id !== userId)
                throw new ForbiddenException("You're not allowed");
        }

        if (entityType === 'Slot') {
            const slot = await prisma.slot.findUnique({
                where: { id },
                select: {
                    Mission: {
                        select: {
                            Event: {
                                select: {
                                    organizer_id: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!slot) throw new NotFoundException('Slot not found');

            if (slot.Mission.Event.organizer_id !== userId)
                throw new ForbiddenException("You're not allowed");
        }
    }
}
