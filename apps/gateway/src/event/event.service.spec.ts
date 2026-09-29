import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, prisma } from '@app/db';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { EventService } from './event.service';
import { EventFiltersDto } from './dto/event-filters.dto';
import { GeoapifyService } from '../geoapify/geoapify.service';
import { MsAuthClient } from '../ms-auth-client/ms-auth-client.service';

jest.mock('@app/db', () => ({
    prisma: {
        event: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
        participation: { findMany: jest.fn() },
    },
}));

describe('EventService.findAll', () => {
    const mockPrisma = prisma as any;
    let service: EventService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new EventService({} as GeoapifyService, {} as MsAuthClient);
        mockPrisma.event.findMany.mockResolvedValue([]);
        mockPrisma.event.count.mockResolvedValue(0);
    });

    const findManyArgs = (): Prisma.EventFindManyArgs =>
        (mockPrisma.event.findMany as jest.Mock).mock
            .calls[0][0] as Prisma.EventFindManyArgs;

    it('pages with skip/take and returns the total for the same filters', async () => {
        mockPrisma.event.count.mockResolvedValue(30);

        const result = await service.findAll({ page: 3, limit: 12 });

        expect(findManyArgs()).toMatchObject({ skip: 24, take: 12 });
        expect(mockPrisma.event.count).toHaveBeenCalledWith({
            where: findManyArgs().where,
        });
        expect(result).toEqual({ items: [], total: 30, page: 3, limit: 12 });
    });

    it('breaks start_date ties by id, so pages never overlap', async () => {
        await service.findAll();

        expect(findManyArgs().orderBy).toEqual([
            { start_date: 'asc' },
            { id: 'asc' },
        ]);
    });

    it('searches the title or the description in the database', async () => {
        await service.findAll({ search: '  concert ' });

        expect(findManyArgs().where?.AND).toContainEqual({
            OR: [
                { title: { contains: 'concert' } },
                { description: { contains: 'concert' } },
            ],
        });
    });

    it('ignores a blank search', async () => {
        await service.findAll({ search: '   ' });

        expect(findManyArgs().where?.AND).toBeUndefined();
    });
});

describe('EventService.findMembers', () => {
    const mockPrisma = prisma as any;
    const msAuthClient = { getProfiles: jest.fn() };
    let service: EventService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new EventService(
            {} as GeoapifyService,
            msAuthClient as unknown as MsAuthClient,
        );
        mockPrisma.event.findUnique.mockResolvedValue({
            organizer_id: 'organizer',
        });
        // The organizer also accepted on their own slot: still listed once, as the organizer.
        mockPrisma.participation.findMany.mockResolvedValue([
            { user_id: 'volunteer' },
            { user_id: 'organizer' },
        ]);
        msAuthClient.getProfiles.mockImplementation(
            (_: string, ids: string[]) =>
                Promise.resolve(
                    ids.map((id) => ({
                        id,
                        email: `${id}@example.com`,
                        first_name: id,
                        last_name: null,
                        avatar_url: null,
                    })),
                ),
        );
    });

    it('lists the organizer then the accepted volunteers, without their emails', async () => {
        const members = await service.findMembers(7, 'volunteer', 'token');

        expect(members).toEqual([
            {
                id: 'organizer',
                first_name: 'organizer',
                last_name: null,
                avatar_url: null,
                role: 'ORGANIZER',
            },
            {
                id: 'volunteer',
                first_name: 'volunteer',
                last_name: null,
                avatar_url: null,
                role: 'VOLUNTEER',
            },
        ]);
        expect(mockPrisma.participation.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    status: 'ACCEPTED',
                    Slot: { Mission: { event_id: 7 } },
                },
            }),
        );
    });

    it('refuses anyone else (a pending volunteer, a stranger)', async () => {
        await expect(
            service.findMembers(7, 'stranger', 'token'),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(msAuthClient.getProfiles).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown event', async () => {
        mockPrisma.event.findUnique.mockResolvedValue(null);

        await expect(
            service.findMembers(404, 'organizer', 'token'),
        ).rejects.toBeInstanceOf(NotFoundException);
    });
});

describe('EventFiltersDto', () => {
    const errorsFor = (query: Record<string, string>) =>
        validateSync(plainToInstance(EventFiltersDto, query)).map(
            (error) => error.property,
        );

    it('accepts a regular page request', () => {
        expect(errorsFor({ page: '2', limit: '12' })).toEqual([]);
    });

    it.each([
        ['page', '0'],
        ['page', '-1'],
        ['page', '1.5'],
        ['page', 'abc'],
        ['limit', '0'],
        ['limit', '51'],
    ])('rejects %s=%s', (property, value) => {
        expect(errorsFor({ [property]: value })).toEqual([property]);
    });

    it('accepts the full query the home page builds', () => {
        expect(
            errorsFor({
                statuses: 'OPEN',
                startDate: '2026-10-01',
                endDate: '2026-10-31',
                city: 'Paris',
                latitude: '48.85',
                longitude: '2.35',
                distanceKm: '25',
                search: 'concert',
                page: '1',
                limit: '12',
            }),
        ).toEqual([]);
    });

    it.each([
        ['statuses', 'FOO'],
        ['startDate', 'pasunedate'],
        ['endDate', '2026-13-45'],
        ['latitude', 'abc'],
        ['latitude', '91'],
        ['longitude', '-181'],
        ['distanceKm', '-5'],
        ['distanceKm', '500'],
    ])('rejects %s=%s', (property, value) => {
        expect(errorsFor({ [property]: value })).toEqual([property]);
    });

    it('rejects a search longer than 100 characters', () => {
        expect(errorsFor({ search: 'a'.repeat(101) })).toEqual(['search']);
    });
});
