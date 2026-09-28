import { prisma } from '@app/db';
import { SlotService } from './slot.service';
import { MsAuthClient } from '../ms-auth-client/ms-auth-client.service';

jest.mock('@app/db', () => ({
    prisma: {
        slot: { findUnique: jest.fn() },
        participation: { count: jest.fn() },
    },
}));

describe('SlotService', () => {
    const mockPrisma = prisma as any;
    const msAuthClient = { getProfiles: jest.fn() };
    let service: SlotService;

    const slot = {
        id: 1,
        mission_id: 5,
        start_at: new Date('2026-10-03T08:00:00Z'),
        end_at: new Date('2026-10-03T10:00:00Z'),
        max_participant: 3,
        status: 'OPEN',
        Mission: { Event: { id: 7, organizer_id: 'organizer1' } },
        Participation: [
            { id: 10, user_id: 'accepted1', status: 'ACCEPTED' },
            { id: 11, user_id: 'pending1', status: 'PENDING' },
        ],
    };

    const profile = (id: string) => ({
        id,
        email: `${id}@example.com`,
        first_name: id,
        last_name: null,
        avatar_url: null,
    });

    beforeEach(() => {
        jest.clearAllMocks();
        service = new SlotService(msAuthClient as unknown as MsAuthClient);
        mockPrisma.slot.findUnique.mockResolvedValue(slot);
        mockPrisma.participation.count.mockResolvedValue(1);
        msAuthClient.getProfiles.mockImplementation(
            (_: string, ids: string[]) => Promise.resolve(ids.map(profile)),
        );
    });

    describe('findOneWithParticipants', () => {
        it('gives the organizer every participant, with their email', async () => {
            const result = await service.findOneWithParticipants(
                'organizer1',
                1,
                'token',
            );

            expect(
                result.participants.map((p) => [p.user_id, p.email]),
            ).toEqual([
                ['accepted1', 'accepted1@example.com'],
                ['pending1', 'pending1@example.com'],
            ]);
        });

        it('gives anyone else the accepted participants only, without email', async () => {
            const result = await service.findOneWithParticipants(
                'volunteer1',
                1,
                'token',
            );

            expect(
                result.participants.map((p) => [p.user_id, p.email]),
            ).toEqual([['accepted1', '']]);
            expect(msAuthClient.getProfiles).toHaveBeenCalledWith('token', [
                'accepted1',
            ]);
        });
    });
});
