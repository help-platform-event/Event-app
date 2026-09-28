/* eslint-disable @typescript-eslint/no-unsafe-return */
import { prisma } from '@app/db';
import { ParticipationService } from './participation.service';
import { DomainEventPublisher } from '../kafka/domain-event.publisher';

jest.mock('@app/db', () => ({
    prisma: {
        participation: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            groupBy: jest.fn(),
        },
        $transaction: jest.fn(),
    },
}));

describe('ParticipationService', () => {
    let service: ParticipationService;
    const mockPrisma = prisma as any;
    const publisher = { publish: jest.fn() };

    beforeEach(() => {
        service = new ParticipationService(
            publisher as unknown as DomainEventPublisher,
        );
        jest.clearAllMocks();
    });

    describe('getMyParticipations', () => {
        it('should map participations with their slot, mission and event', async () => {
            mockPrisma.participation.findMany.mockResolvedValue([
                {
                    id: 3,
                    status: 'ACCEPTED',
                    Slot: {
                        id: 10,
                        start_at: new Date('2026-10-03T08:00:00Z'),
                        end_at: new Date('2026-10-03T10:00:00Z'),
                        Mission: {
                            id: 5,
                            title: 'Tri',
                            Event: {
                                id: 7,
                                title: 'Clean-up day',
                                start_date: new Date('2026-10-03T07:00:00Z'),
                            },
                        },
                    },
                },
            ] as any);

            const result = await service.getMyParticipations('user1');

            expect(mockPrisma.participation.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { user_id: 'user1' } }),
            );
            expect(result).toEqual([
                {
                    id: 3,
                    status: 'ACCEPTED',
                    slot: {
                        id: 10,
                        startAt: '2026-10-03T08:00:00.000Z',
                        endAt: '2026-10-03T10:00:00.000Z',
                    },
                    mission: { id: 5, title: 'Tri' },
                    event: {
                        id: 7,
                        title: 'Clean-up day',
                        startDate: '2026-10-03T07:00:00.000Z',
                    },
                },
            ]);
        });

        it('should return an empty list when the user has no participations', async () => {
            mockPrisma.participation.findMany.mockResolvedValue([]);

            await expect(service.getMyParticipations('user1')).resolves.toEqual(
                [],
            );
        });
    });

    describe('create', () => {
        let mockTx: any;
        const openSlot = {
            id: 1,
            status: 'OPEN',
            max_participant: 5,
            start_at: new Date('2026-10-03T08:00:00Z'),
            Mission: {
                Event: {
                    id: 7,
                    title: 'Clean-up day',
                    organizer_id: 'organizer1',
                },
            },
        };

        beforeEach(() => {
            mockTx = {
                slot: {
                    findUnique: jest.fn(),
                },
                participation: {
                    count: jest.fn(),
                    findUnique: jest.fn(),
                    update: jest.fn(),
                    create: jest.fn(),
                },
            };

            mockPrisma.$transaction.mockImplementation(
                async (callback: any) => await callback(mockTx),
            );
        });

        it('should create a new participation when slot exists and user can join', async () => {
            mockTx.slot.findUnique.mockResolvedValue(openSlot);
            mockTx.participation.count.mockResolvedValue(2);
            mockTx.participation.findUnique.mockResolvedValue(null);
            mockTx.participation.create.mockResolvedValue({
                id: 1,
                user_id: 'user1',
                slot_id: 1,
                status: 'PENDING',
            });

            const result = await service.create('user1', 1);

            expect(mockTx.participation.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { user_id: 'user1', slot_id: 1, status: 'PENDING' },
                }),
            );
            expect(result).toEqual(
                expect.objectContaining({ id: 1, status: 'PENDING' }),
            );
        });

        it('should notify the organizer through Kafka once committed', async () => {
            mockTx.slot.findUnique.mockResolvedValue(openSlot);
            mockTx.participation.count.mockResolvedValue(0);
            mockTx.participation.findUnique.mockResolvedValue(null);
            mockTx.participation.create.mockResolvedValue({
                id: 42,
                user_id: 'user1',
                slot_id: 1,
                status: 'PENDING',
            });

            await service.create('user1', 1);

            expect(publisher.publish).toHaveBeenCalledWith(
                'event.participation.requested',
                'organizer1',
                expect.objectContaining({
                    eventId: expect.any(String),
                    occurredAt: expect.any(String),
                    participationId: 42,
                    recipientUserId: 'organizer1',
                    actorUserId: 'user1',
                    event: { id: 7, title: 'Clean-up day' },
                    slot: { id: 1, startAt: '2026-10-03T08:00:00.000Z' },
                }),
            );
        });

        it('should throw NotFoundException when slot does not exist', async () => {
            mockTx.slot.findUnique.mockResolvedValue(null);

            await expect(service.create('user1', 999)).rejects.toThrow(
                'Slot not found',
            );
            expect(publisher.publish).not.toHaveBeenCalled();
        });

        it('should throw BadRequestException when slot is full', async () => {
            mockTx.slot.findUnique.mockResolvedValue({
                ...openSlot,
                status: 'FULL',
            });
            mockTx.participation.count.mockResolvedValue(5);
            mockTx.participation.findUnique.mockResolvedValue(null);

            await expect(service.create('user1', 1)).rejects.toThrow();

            expect(mockTx.participation.create).not.toHaveBeenCalled();
        });

        it('should update (rejoin) when existing participation is CANCELLED', async () => {
            mockTx.slot.findUnique.mockResolvedValue(openSlot);
            mockTx.participation.count.mockResolvedValue(2);
            mockTx.participation.findUnique.mockResolvedValue({
                status: 'CANCELLED',
            });
            mockTx.participation.update.mockResolvedValue({
                id: 1,
                status: 'PENDING',
            });

            await service.create('user1', 1);

            expect(mockTx.participation.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ status: 'PENDING' }),
                }),
            );
            expect(mockTx.participation.create).not.toHaveBeenCalled();
        });

        it('should throw ConflictException when already registered (not cancelled)', async () => {
            mockTx.slot.findUnique.mockResolvedValue(openSlot);
            mockTx.participation.count.mockResolvedValue(2);
            mockTx.participation.findUnique.mockResolvedValue({
                status: 'PENDING',
            });

            await expect(service.create('user1', 1)).rejects.toThrow(
                'Already registered',
            );
        });
    });

    describe('transition', () => {
        let mockTx: any;
        const pendingSlot = {
            start_at: new Date('2026-10-03T08:00:00Z'),
            Mission: {
                Event: {
                    id: 7,
                    title: 'Clean-up day',
                    organizer_id: 'organizer1',
                },
            },
        };

        beforeEach(() => {
            mockTx = {
                participation: {
                    findUnique: jest.fn(),
                    update: jest.fn(),
                    count: jest.fn(),
                },
                slot: {
                    findUniqueOrThrow: jest.fn(),
                    update: jest.fn(),
                },
            };

            mockPrisma.$transaction.mockImplementation(
                async (callback: any) => await callback(mockTx),
            );
        });

        it('should accept a participation when organizer accepts a pending one', async () => {
            mockTx.participation.findUnique.mockResolvedValue({
                user_id: 'applicant1',
                status: 'PENDING',
                slot_id: 1,
                Slot: pendingSlot,
            });
            mockTx.participation.update.mockResolvedValue({
                id: 1,
                status: 'ACCEPTED',
            });
            mockTx.slot.findUniqueOrThrow.mockResolvedValue({
                max_participant: 5,
                status: 'OPEN',
            });
            mockTx.participation.count.mockResolvedValue(1);

            const result = await service.transition('organizer1', 1, 'ACCEPT');

            expect(mockTx.participation.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 1 },
                    data: expect.objectContaining({ status: 'ACCEPTED' }),
                }),
            );
            expect(result).toEqual(
                expect.objectContaining({ id: 1, status: 'ACCEPTED' }),
            );
        });

        it('should throw NotFoundException when participation does not exist', async () => {
            mockTx.participation.findUnique.mockResolvedValue(null);

            await expect(
                service.transition('user1', 999, 'ACCEPT'),
            ).rejects.toThrow('Participation not found');
        });

        it('should throw ForbiddenException when non-organizer tries to accept', async () => {
            mockTx.participation.findUnique.mockResolvedValue({
                user_id: 'applicant1',
                status: 'PENDING',
                slot_id: 1,
                Slot: pendingSlot,
            });

            await expect(
                service.transition('someoneElse', 1, 'ACCEPT'),
            ).rejects.toThrow();

            expect(mockTx.participation.update).not.toHaveBeenCalled();
        });

        it('should sync slot status to FULL after accepting the last spot', async () => {
            mockTx.participation.findUnique.mockResolvedValue({
                user_id: 'applicant1',
                status: 'PENDING',
                slot_id: 1,
                Slot: pendingSlot,
            });
            mockTx.participation.update.mockResolvedValue({
                id: 1,
                status: 'ACCEPTED',
            });
            mockTx.slot.findUniqueOrThrow.mockResolvedValue({
                max_participant: 1,
                status: 'OPEN',
            });
            mockTx.participation.count.mockResolvedValue(1);

            await service.transition('organizer1', 1, 'ACCEPT');

            expect(mockTx.slot.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { status: 'FULL' },
            });
        });

        it('should not sync slot status for REJECT action', async () => {
            mockTx.participation.findUnique.mockResolvedValue({
                user_id: 'applicant1',
                status: 'PENDING',
                slot_id: 1,
                Slot: pendingSlot,
            });
            mockTx.participation.update.mockResolvedValue({
                id: 1,
                status: 'REJECTED',
            });

            await service.transition('organizer1', 1, 'REJECT');

            expect(mockTx.slot.findUniqueOrThrow).not.toHaveBeenCalled();
        });

        it('should notify the participant of the decision once committed', async () => {
            mockTx.participation.findUnique.mockResolvedValue({
                user_id: 'applicant1',
                status: 'PENDING',
                slot_id: 1,
                Slot: pendingSlot,
            });
            mockTx.participation.update.mockResolvedValue({
                id: 3,
                status: 'REJECTED',
            });

            await service.transition('organizer1', 3, 'REJECT');

            expect(publisher.publish).toHaveBeenCalledWith(
                'event.participation.decided',
                'applicant1',
                expect.objectContaining({
                    participationId: 3,
                    recipientUserId: 'applicant1',
                    actorUserId: 'organizer1',
                    event: { id: 7, title: 'Clean-up day' },
                    slot: { id: 1, startAt: '2026-10-03T08:00:00.000Z' },
                    status: 'REJECTED',
                }),
            );
        });

        it.each([
            ['applicant1', 'organizer1', 'PARTICIPANT'],
            ['organizer1', 'applicant1', 'ORGANIZER'],
        ])(
            'should notify the other party when %s cancels',
            async (actor, recipient, cancelledBy) => {
                mockTx.participation.findUnique.mockResolvedValue({
                    user_id: 'applicant1',
                    status: 'ACCEPTED',
                    slot_id: 1,
                    Slot: pendingSlot,
                });
                mockTx.participation.update.mockResolvedValue({
                    id: 3,
                    status: 'CANCELLED',
                });
                mockTx.slot.findUniqueOrThrow.mockResolvedValue({
                    max_participant: 5,
                    status: 'OPEN',
                });
                mockTx.participation.count.mockResolvedValue(0);

                await service.transition(actor, 3, 'CANCEL');

                expect(publisher.publish).toHaveBeenCalledWith(
                    'event.participation.cancelled',
                    recipient,
                    expect.objectContaining({
                        participationId: 3,
                        recipientUserId: recipient,
                        actorUserId: actor,
                        cancelledBy,
                        event: { id: 7, title: 'Clean-up day' },
                    }),
                );
            },
        );

        it('should not publish anything when the transition is refused', async () => {
            mockTx.participation.findUnique.mockResolvedValue({
                user_id: 'applicant1',
                status: 'PENDING',
                slot_id: 1,
                Slot: pendingSlot,
            });

            await expect(
                service.transition('someoneElse', 1, 'ACCEPT'),
            ).rejects.toThrow();
            expect(publisher.publish).not.toHaveBeenCalled();
        });
    });
});
