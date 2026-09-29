import { Prisma, prisma } from '@app/db';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { EventService } from './event.service';
import { EventFiltersDto } from './dto/event-filters.dto';
import { GeoapifyService } from '../geoapify/geoapify.service';
import { MsAuthClient } from '../ms-auth-client/ms-auth-client.service';

jest.mock('@app/db', () => ({
    prisma: {
        event: { findMany: jest.fn(), count: jest.fn() },
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

    it('rejects a search longer than 100 characters', () => {
        expect(errorsFor({ search: 'a'.repeat(101) })).toEqual(['search']);
    });
});
