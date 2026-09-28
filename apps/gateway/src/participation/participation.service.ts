import { SlotMapper } from './../slot/dto/mapper/slot.mapper';
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ParticipationContext } from './type/participation.types';
import {
    PARTICIPATION_TRANSITIONS,
    TransitionName,
} from './policy/participations.transition';
import { prisma, Prisma } from '@app/db';
import {
    EventDto,
    MissionDto,
    MyParticipationDto,
    ParticipantDto,
    SlotDto,
} from '@app/contracts';
import { assertCanCreateOrRejoin } from './policy/participation.guards';
import { assertCanJoin } from './policy/slot.guards';
import { toMissionDto } from '../mission/mapper/mission.mapper';
import { participationQuery } from './query/participation.query';
import { DomainEventPublisher } from '../kafka/domain-event.publisher';
import { KAFKA_TOPICS } from '../kafka/kafka.topics';
import type {
    ParticipationCancelledEvent,
    ParticipationDecidedEvent,
    ParticipationRequestedEvent,
} from '@app/contracts';

@Injectable()
export class ParticipationService {
    constructor(private readonly events: DomainEventPublisher) {}

    /**
     * Create a participation on a slot :
     *  - Check if slot exist
     *  - Check if slot is full
     *  - Check is the user is already registered
     *  - Update if the participation has been cancelled
     *
     * We use transaction because we need that all check pass for the
     * creation of the participation (Important for the count of the
     * current participants)
     *
     * @param currentUserId The currently logged-in User
     * @param slotId The slot of a mission
     * Once committed, the organizer is notified through Kafka
     * (`event.participation.requested`).
     *
     * @returns Creation of a participation in "Pending" state
     */
    async create(
        currentUserId: string,
        slotId: number,
    ): Promise<ParticipantDto> {
        const { participation, slot } = await prisma.$transaction(
            async (tx) => {
                //Check if slot exist
                const slot = await this.getSlotOrThrow(tx, slotId);

                //Get currentParticipants and Check if already registered
                const { existing, currentParticipants } =
                    await this.getSlotContext(tx, slotId, currentUserId);

                //Policies
                assertCanCreateOrRejoin(existing);
                assertCanJoin(slot, currentParticipants);

                //Update or Create participation
                const participation = await this.createOrRejointParticipation(
                    tx,
                    currentUserId,
                    slotId,
                    existing,
                );

                return { participation, slot };
            },
        );

        const event = slot.Mission.Event;
        const payload: ParticipationRequestedEvent = {
            eventId: randomUUID(),
            occurredAt: new Date().toISOString(),
            participationId: participation.id,
            recipientUserId: event.organizer_id,
            actorUserId: currentUserId,
            event: { id: event.id, title: event.title },
            slot: { id: slot.id, startAt: slot.start_at.toISOString() },
        };
        await this.events.publish(
            KAFKA_TOPICS.PARTICIPATION_REQUESTED,
            payload.recipientUserId,
            payload,
        );

        return participation;
    }

    private async getSlotOrThrow(tx: Prisma.TransactionClient, slotId: number) {
        //Check if slot exist (with its event, needed for the notification)
        const slot = await tx.slot.findUnique({
            where: { id: slotId },
            include: {
                Mission: {
                    select: {
                        Event: {
                            select: {
                                id: true,
                                title: true,
                                organizer_id: true,
                            },
                        },
                    },
                },
            },
        });

        if (!slot) throw new NotFoundException('Slot not found');

        return slot;
    }

    private async getSlotContext(
        tx: Prisma.TransactionClient,
        slotId: number,
        currentUserId: string,
    ) {
        //Count currentParticipants
        const currentParticipants = await tx.participation.count({
            where: { slot_id: slotId, status: 'ACCEPTED' },
        });

        //Check if user is already registered
        const existing = await tx.participation.findUnique({
            where: {
                unique_user_slot: {
                    user_id: currentUserId,
                    slot_id: slotId,
                },
            },
        });

        return { existing, currentParticipants };
    }

    private async createOrRejointParticipation(
        tx: Prisma.TransactionClient,
        currentUserId: string,
        slotId: number,
        existing: ParticipantDto | null,
    ): Promise<ParticipantDto> {
        //Update existing participation with status "CANCELLED"
        if (existing?.status === 'CANCELLED') {
            return tx.participation.update({
                where: {
                    unique_user_slot: {
                        user_id: currentUserId,
                        slot_id: slotId,
                    },
                },
                data: {
                    status: 'PENDING',
                    decision_at: null,
                    cancelled_at: null,
                },
                ...participationQuery,
            });
        }

        //Create  participation
        return await tx.participation.create({
            data: {
                user_id: currentUserId,
                slot_id: slotId,
                status: 'PENDING',
            },
            ...participationQuery,
        });
    }

    async findAll(): Promise<ParticipantDto[]> {
        return await prisma.participation.findMany();
    }

    async findOne(id: number): Promise<ParticipantDto> {
        const participation = await prisma.participation.findUnique({
            where: { id },
        });

        if (!participation)
            throw new NotFoundException('Participation not found');

        return participation;
    }

    /**
     * The user's participations with their slot, mission and event, soonest slot first
     * ("Mes missions" page). No participation → an empty list.
     */
    async getMyParticipations(userId: string): Promise<MyParticipationDto[]> {
        const participations = await prisma.participation.findMany({
            where: { user_id: userId },
            orderBy: { Slot: { start_at: 'asc' } },
            select: {
                id: true,
                status: true,
                Slot: {
                    select: {
                        id: true,
                        start_at: true,
                        end_at: true,
                        Mission: {
                            select: {
                                id: true,
                                title: true,
                                Event: {
                                    select: {
                                        id: true,
                                        title: true,
                                        start_date: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        return participations.map((p) => ({
            id: p.id,
            status: p.status,
            slot: {
                id: p.Slot.id,
                startAt: p.Slot.start_at.toISOString(),
                endAt: p.Slot.end_at.toISOString(),
            },
            mission: { id: p.Slot.Mission.id, title: p.Slot.Mission.title },
            event: {
                id: p.Slot.Mission.Event.id,
                title: p.Slot.Mission.Event.title,
                startDate: p.Slot.Mission.Event.start_date.toISOString(),
            },
        }));
    }

    /**
     * Retrieve all slots in which the user is participating.
     *
     * This method returns a list of slots associated with the connected user,
     * enriched with the number of accepted participants and remaining 
	 * available places.
     *
     * The participant count is calculated using a grouped query.
     *
     * @param userId - The User currently logged-in.
     *
     * @throws {NotFoundException} If no slots are found (optional, depending on your implementation)
    
     */
    async getMySlots(userId: string): Promise<SlotDto[]> {
        const participations = await prisma.participation.findMany({
            where: { user_id: userId },
            select: {
                Slot: {
                    select: {
                        id: true,
                        mission_id: true,
                        start_at: true,
                        end_at: true,
                        max_participant: true,
                        status: true,
                        Mission: {
                            select: {
                                Event: {
                                    select: { organizer_id: true },
                                },
                            },
                        },
                        Participation: {
                            select: { user_id: true, status: true, id: true },
                        },
                    },
                },
            },
        });

        if (participations.length === 0)
            throw new NotFoundException('No participations found');

        const slots = participations.map((p) => p.Slot);
        const slotIds = slots.map((s) => s.id);

        /**
         * Computes the number of accepted participants per slot.
         *
         * This query groups all participations by slot_id and counts
         * how many users have an "ACCEPTED" status for each slot.
         *
         *
         * Only slots included in the provided slotIds array are used.
         *
         * @param slotIds - Array of slot IDs to compute participant counts for
         *
         * @returns An array of grouped results where each entry contains:
         * - slot_id: the slot id
         * - _count.slot_id: number of accepted participants for that slot
         *
         * @example
         * const counts = await prisma.participation.groupBy({
         *   by: ['slot_id'],
         *   where: {
         *     slot_id: { in: slotIds },
         *     status: 'ACCEPTED',
         *   },
         *   _count: {
         *     slot_id: true,
         *   },
         * });
         *
         * // Result:
         * // [
         * //   { slot_id: 1, _count: { slot_id: 3 } },
         * //   { slot_id: 2, _count: { slot_id: 5 } }
         * // ]
         */
        const counts = await prisma.participation.groupBy({
            by: ['slot_id'],
            where: {
                slot_id: { in: slotIds },
                status: 'ACCEPTED',
            },
            _count: {
                slot_id: true,
            },
        });

        const countMap = new Map<number, number>();
        counts.forEach((c) => {
            countMap.set(c.slot_id, c._count.slot_id);
        });

        return slots.map((slot) =>
            SlotMapper.toSlotDto(userId, slot, countMap.get(slot.id) ?? 0),
        );
    }

    private uniqueBy<T, K extends keyof T>(items: T[], key: K) {
        const itemMap = new Map<T[K], T>();
        items.forEach((item) => {
            itemMap.set(item[key], item);
        });

        return [...itemMap.values()];
    }

    async getMyMissions(userId: string): Promise<MissionDto[]> {
        const participations = await prisma.participation.findMany({
            where: { user_id: userId },
            select: {
                Slot: {
                    select: {
                        Mission: {
                            select: {
                                id: true,
                                event_id: true,
                                title: true,
                                description: true,
                                status: true,
                                Event: {
                                    select: {
                                        organizer_id: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (participations.length === 0)
            throw new NotFoundException("You don't have any participations");

        const missions = this.uniqueBy(
            participations.map((p) => p.Slot.Mission),
            'id',
        );

        return missions.map((m) => toMissionDto(m));
    }

    async getMyEvents(
        userId: string,
    ): Promise<Omit<EventDto, 'address' | 'missions'>[]> {
        const participations = await prisma.participation.findMany({
            where: { user_id: userId },
            select: {
                Slot: {
                    select: {
                        Mission: {
                            select: {
                                Event: true,
                            },
                        },
                    },
                },
            },
        });

        if (participations.length === 0)
            throw new NotFoundException("You don't have any participations");

        return this.uniqueBy(
            participations.map((p) => p.Slot.Mission.Event),
            'id',
        );
    }

    /**
     * Applies an ACCEPT / REJECT / CANCEL transition. Once committed, an ACCEPT or REJECT
     * notifies the participant through Kafka (`event.participation.decided`), and a CANCEL notifies
     * the other party (`event.participation.cancelled`).
     */
    async transition(
        userId: string,
        participationId: number,
        action: TransitionName,
    ): Promise<ParticipantDto> {
        const { updated, participation } = await prisma.$transaction((tx) =>
            this.applyTransition(tx, userId, participationId, action),
        );

        const base = {
            eventId: randomUUID(),
            occurredAt: new Date().toISOString(),
            participationId,
            actorUserId: userId,
            event: {
                id: participation.event.id,
                title: participation.event.title,
            },
            slot: {
                id: participation.slotId,
                startAt: participation.slotStartAt.toISOString(),
            },
        };

        if (updated.status === 'ACCEPTED' || updated.status === 'REJECTED') {
            const payload: ParticipationDecidedEvent = {
                ...base,
                recipientUserId: participation.userId,
                status: updated.status,
            };
            await this.events.publish(
                KAFKA_TOPICS.PARTICIPATION_DECIDED,
                payload.recipientUserId,
                payload,
            );
        }

        if (updated.status === 'CANCELLED') {
            // Le bénévole annule → on prévient l'organisateur ; l'organisateur annule → le bénévole.
            const byParticipant = userId === participation.userId;
            const payload: ParticipationCancelledEvent = {
                ...base,
                recipientUserId: byParticipant
                    ? participation.event.organizerId
                    : participation.userId,
                cancelledBy: byParticipant ? 'PARTICIPANT' : 'ORGANIZER',
            };
            await this.events.publish(
                KAFKA_TOPICS.PARTICIPATION_CANCELLED,
                payload.recipientUserId,
                payload,
            );
        }

        return updated;
    }

    private async applyTransition(
        tx: Prisma.TransactionClient,
        userId: string,
        participationId: number,
        action: TransitionName,
    ): Promise<{
        updated: ParticipantDto;
        participation: ParticipationContext;
    }> {
        const participation = await this.findWithContextOrThrow(
            tx,
            participationId,
        );
        const transition = PARTICIPATION_TRANSITIONS[action];

        // une seule fonction qui vérifie À LA FOIS le rôle ET l'état de départ
        transition.guard(userId, participation);

        const updated = await tx.participation.update({
            where: { id: participationId },
            data: {
                status: transition.toStatus,
                decision_at: transition.decision_at(),
                cancelled_at: transition.cancelled_at(),
            },
            ...participationQuery,
        });

        if (action === 'ACCEPT' || action === 'CANCEL') {
            await this.syncSlotStatus(tx, participation.slotId);
        }

        return { updated, participation };
    }

    async findWithContextOrThrow(
        tx: Prisma.TransactionClient,
        participationId: number,
    ): Promise<ParticipationContext> {
        const participation = await tx.participation.findUnique({
            where: { id: participationId },
            select: {
                user_id: true,
                status: true,
                slot_id: true,
                Slot: {
                    select: {
                        start_at: true,
                        Mission: {
                            select: {
                                Event: {
                                    select: {
                                        id: true,
                                        title: true,
                                        organizer_id: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!participation)
            throw new NotFoundException('Participation not found');
        return {
            userId: participation.user_id,
            status: participation.status,
            slotId: participation.slot_id,
            event: {
                id: participation.Slot.Mission.Event.id,
                title: participation.Slot.Mission.Event.title,
                organizerId: participation.Slot.Mission.Event.organizer_id,
            },
            slotStartAt: participation.Slot.start_at,
        };
    }

    private async syncSlotStatus(tx: Prisma.TransactionClient, slotId: number) {
        const slot = await tx.slot.findUniqueOrThrow({
            where: { id: slotId },
            select: { max_participant: true, status: true },
        });

        if (slot.status === 'CLOSED' || slot.status === 'CANCELLED') return;

        const acceptedCount = await tx.participation.count({
            where: { slot_id: slotId, status: 'ACCEPTED' },
        });

        const shouldBeFull = acceptedCount >= slot.max_participant;
        const newStatus = shouldBeFull ? 'FULL' : 'OPEN';

        if (newStatus !== slot.status) {
            await tx.slot.update({
                where: { id: slotId },
                data: { status: newStatus },
            });
        }
    }
}
