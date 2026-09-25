import { GeoapifyService } from './../geoapify/geoapify.service';
import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { toEventWithAddress, toEventDetails } from './dto/event.mapper';
import { EventFiltersDto } from './dto/event-filters.dto';
import { CreateAddressDto } from '../address/dto/create-address.dto';
import { toGeocodeDto } from '../address/mapper/address.mapper';
import { Coordinates } from '../geoapify/type/geoapify.type';
import { Prisma, prisma } from '@app/db';
import { EventDto, EventWithAddress, PaginatedEventsDto } from '@app/contracts';
import { MsAuthClient } from '../ms-auth-client/ms-auth-client.service';
import { eventDetailsQuery } from './query/event-details.query';
import { eventWithAddressQuery } from './query/event-address.query';

@Injectable()
export class EventService {
    constructor(
        private readonly geoapifyService: GeoapifyService,
        private readonly msAuthClient: MsAuthClient,
    ) {}

    async create(
        createEventDto: CreateEventDto,
        userId: string,
        accessToken: string,
    ): Promise<EventWithAddress> {
        await this.msAuthClient.getUser(accessToken, userId);

        const hasConflict = await this.hasEventConflict(
            userId,
            new Date(createEventDto.start_date),
            createEventDto.address,
        );

        if (hasConflict) {
            throw new ConflictException(
                'Conflit : un événement existe déjà pour cet utilisateur à cette date et cette adresse.',
            );
        }

        const { address, ...eventData } = createEventDto;
        const coordinates = await this.geoapifyService.geocodeAddress(address);

        const newEvent = await prisma.event.create({
            data: {
                ...eventData,
                organizer_id: userId,
                Address: {
                    connectOrCreate: {
                        where: {
                            unique_address: {
                                street_number: address.street_number,
                                street_name: address.street_name,
                                city: address.city,
                                postal_code: address.postal_code,
                                country: address.country,
                            },
                        },
                        create: {
                            street_number: address.street_number,
                            street_name: address.street_name,
                            address_line_2: address.address_line_2,
                            city: address.city,
                            postal_code: address.postal_code,
                            country: address.country,
                            coordinates_lat: coordinates?.lat ?? null,
                            coordinates_lon: coordinates?.lon ?? null,
                        },
                    },
                },
                start_date: new Date(createEventDto.start_date),
                end_date: new Date(createEventDto.end_date),
            },
            ...eventWithAddressQuery,
        });

        return toEventWithAddress(newEvent);
    }

    async hasEventConflict(
        userId: string,
        startDate: Date,
        address: CreateAddressDto,
        excludeEventId?: number,
    ): Promise<boolean> {
        const existingEvent = await prisma.event.findFirst({
            where: {
                organizer_id: userId,
                start_date: startDate,
                ...(excludeEventId ? { NOT: { id: excludeEventId } } : {}),
                Address: {
                    is: {
                        street_number: address.street_number,
                        street_name: address.street_name,
                        city: address.city,
                        postal_code: address.postal_code,
                        country: address.country,
                    },
                },
            },
            select: { id: true },
        });

        return Boolean(existingEvent);
    }

    private async findOwnedEventOrFail(id: number, userId: string) {
        const existingEvent = await prisma.event.findUnique({
            where: { id },
            select: {
                id: true,
                organizer_id: true,
                start_date: true,
                Address: {
                    select: {
                        id: true,
                        street_number: true,
                        street_name: true,
                        address_line_2: true,
                        city: true,
                        postal_code: true,
                        country: true,
                    },
                },
            },
        });

        if (!existingEvent) {
            throw new NotFoundException('Événement non trouvé.');
        }

        if (existingEvent.organizer_id !== userId) {
            throw new ForbiddenException(
                'Vous ne pouvez pas modifier cet événement.',
            );
        }

        return existingEvent;
    }

    /**
     * Récupère la liste des événements avec filtrage avancé et pagination.
     *
     * Cette méthode combine plusieurs types de filtres :
     * - filtres simples (statut, ville, dates)
     * - filtrage géographique (latitude / longitude + distance)
     * - pagination côté backend
     *
     * Le filtrage par distance est effectué en mémoire après requête DB
     * via la formule de Haversine (car Prisma ne gère pas nativement ce type de calcul).
     *
     * Logique importante :
     * - Si une ville est fournie sans géolocalisation → filtre SQL sur la ville
     * - Si une géolocalisation est fournie → le filtre ville est ignoré
     * - Si distanceKm est défini → filtrage par rayon (post-query)
     *
     * @param {EventFiltersDto} [filters] - Filtres optionnels (date, ville, géoloc, statut, pagination)
     * @return {Promise<PaginatedEventsDto>} Liste paginée des événements filtrés
     * @memberof EventService
     */
    async findAll(filters?: EventFiltersDto): Promise<PaginatedEventsDto> {
        // Pagination : Page courante, Nombre d'éléments par page, Offset pour pagination SQL
        const page = filters?.page ?? 1;
        const limit = filters?.limit ?? 12;
        const skip = (page - 1) * limit;

        // FILTRES GÉOGRAPHIQUES : Ville recherchée, Coordonnées GPS, Rayon de recherche en kilomètres, Indique si un filtre géographique est actif
        const requestedCity = filters?.city?.trim().toLowerCase();

        const latitude = filters?.latitude;
        const longitude = filters?.longitude;
        const distanceKm = filters?.distanceKm;

        const useGeo =
            latitude != null &&
            longitude != null &&
            distanceKm != null &&
            distanceKm > 0;

        // FILTRES DE DATES : Date de début, Date de fin
        const start = filters?.startDate
            ? new Date(filters.startDate)
            : undefined;

        const end = filters?.endDate ? new Date(filters.endDate) : undefined;

        // Normalisation de la date de fin pour inclure toute la journée
        if (end) end.setHours(23, 59, 59, 999);

        // CONSTRUCTION DES CONDITIONS PRISMA :
        const andConditions: Prisma.EventWhereInput[] = [];

        // Filtre date de début
        if (start) {
            andConditions.push({
                end_date: {
                    // gte: supérieur ou égal
                    gte: start,
                },
            });
        }

        // Filtre date de fin
        if (end) {
            andConditions.push({
                start_date: {
                    // lte: inférieur ou égal
                    lte: end,
                },
            });
        }

        // WHERE PRINCIPAL (SQL) :
        const where: Prisma.EventWhereInput = {
            // Filtre statut (par défaut : exclut CANCELLED)
            status: filters?.statuses?.length
                ? { in: filters.statuses }
                : { not: 'CANCELLED' },

            // Filtre ville uniquement si PAS de géolocalisation
            ...(requestedCity &&
                !useGeo && {
                    Address: {
                        city: {
                            startsWith: requestedCity,
                        },
                    },
                }),

            // Ajout des conditions date si présentes
            ...(andConditions.length > 0 && {
                AND: andConditions,
            }),
        };

        /**
         * FILTRE GÉOGRAPHIQUE (BOUNDING BOX)
         *
         * Objectif :
         * Filtrer les événements situés dans un rayon autour d’un point GPS
         * (latitude / longitude) directement en base de données.
         *
         * Problème :
         * Calculer une distance réelle (formule de Haversine) en SQL avec Prisma
         * est complexe et peu performant sans fonctions géospatiales avancées.
         *
         * Solution :
         * Utiliser une "bounding box" (boîte englobante), c’est-à-dire un rectangle
         * autour du point de recherche.
         *
         * Principe :
         * - On transforme une distance en kilomètres en "delta" de latitude/longitude
         * - On récupère tous les points compris dans ce rectangle
         *
         * Avantages :
         * - Très rapide (utilise les index SQL)
         * - Compatible avec MySQL / MariaDB
         * - Permet une pagination correcte côté base de données
         *
         * Limite :
         * - Le résultat est une approximation (rectangle ≠ cercle)
         * - Certains points peuvent être légèrement en dehors du rayon réel
         *
         * Bon usage :
         * - Suffisant dans 95% des cas
         * - Peut être combiné avec un calcul Haversine en post-traitement si besoin de précision
         */
        if (useGeo) {
            const latDelta = distanceKm / 111;
            const lonDelta =
                distanceKm / (111 * Math.cos((latitude * Math.PI) / 180));

            /**
             * Construction du filtre Prisma sur la relation Address
             *
             * "is" est utilisé car :
             * - Address est une relation 1-1
             * - Prisma attend { Address: { is: {...} } }
             *
             * On filtre :
             * - latitude entre min et max
             * - longitude entre min et max
             */
            where.Address = {
                is: {
                    coordinates_lat: {
                        gte: latitude - latDelta,
                        lte: latitude + latDelta,
                    },
                    coordinates_lon: {
                        gte: longitude - lonDelta,
                        lte: longitude + lonDelta,
                    },
                },
            };
        }

        // REQUÊTE BASE DE DONNÉES :

        const [events, total] = await Promise.all([
            // findMany → récupération des événements paginés
            prisma.event.findMany({
                where,
                // skip / take → pagination SQL (performante)
                skip,
                take: limit,
                orderBy: {
                    start_date: 'asc', // garantit une pagination stable (évite doublons / trous)
                },
                ...eventWithAddressQuery,
            }),
            // count → total des résultats (pour pagination front)
            prisma.event.count({ where }),
        ]);

        // PAGINATION FINALE :

        return {
            items: events.map((e) => toEventWithAddress(e)),
            total,
            page,
            limit,
        };
    }

    async findAllMyEvents(
        userId: string,
        accessToken: string,
    ): Promise<EventWithAddress[]> {
        await this.msAuthClient.getUser(accessToken, userId);

        const events = await prisma.event.findMany({
            where: { organizer_id: userId },
            ...eventWithAddressQuery,
        });

        return events.map((event) => {
            return toEventWithAddress(event);
        });
    }

    async findOneWithRelation(
        eventId: number,
        userId?: string,
    ): Promise<EventDto> {
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            ...eventDetailsQuery,
        });

        if (!event) throw new NotFoundException('Événement non trouvé');

        return toEventDetails(event, userId);
    }

    async findOne(id: number): Promise<EventWithAddress> {
        const event = await prisma.event.findUnique({
            where: {
                id,
                status: {
                    not: 'CANCELLED',
                },
            },
            ...eventWithAddressQuery,
        });

        if (!event) throw new NotFoundException('Événement non trouvé');
        return toEventWithAddress(event);
    }

    async update(
        id: number,
        updateEventDto: UpdateEventDto,
        userId: string,
        accessToken: string,
    ): Promise<EventWithAddress> {
        const existingEvent = await this.findOwnedEventOrFail(id, userId);
        await this.msAuthClient.getUser(accessToken, userId);

        const { address, ...eventData } = updateEventDto;
        const nextStartDate = eventData.start_date
            ? new Date(eventData.start_date)
            : existingEvent.start_date;
        const nextAddress = address ?? {
            ...existingEvent.Address,
            address_line_2: existingEvent.Address.address_line_2 ?? undefined,
        };

        const hasConflict = await this.hasEventConflict(
            userId,
            nextStartDate,
            nextAddress,
            id,
        );

        if (hasConflict) {
            throw new ConflictException(
                'Conflit : un événement existe déjà pour cet utilisateur à cette date et cette adresse.',
            );
        }

        let coordinates: Coordinates | null = null;

        if (address) {
            const geoAddress = address
                ? toGeocodeDto(address)
                : toGeocodeDto(existingEvent.Address);

            coordinates = await this.geoapifyService.geocodeAddress(geoAddress);
        }

        const event = await prisma.event.update({
            where: { id },
            data: {
                ...eventData,
                ...(eventData.start_date
                    ? { start_date: new Date(eventData.start_date) }
                    : {}),
                ...(eventData.end_date
                    ? { end_date: new Date(eventData.end_date) }
                    : {}),
                ...(address
                    ? {
                          Address: {
                              connectOrCreate: {
                                  where: {
                                      unique_address: {
                                          street_number: address.street_number,
                                          street_name: address.street_name,
                                          city: address.city,
                                          postal_code: address.postal_code,
                                          country: address.country,
                                      },
                                  },
                                  create: {
                                      street_number: address.street_number,
                                      street_name: address.street_name,
                                      address_line_2: address.address_line_2,
                                      city: address.city,
                                      postal_code: address.postal_code,
                                      country: address.country,
                                      coordinates_lat: coordinates?.lat ?? null,
                                      coordinates_lon: coordinates?.lon ?? null,
                                  },
                              },
                          },
                      }
                    : {}),
                organizer_id: userId,
                status: eventData.status,
            },
            ...eventWithAddressQuery,
        });

        return toEventWithAddress(event);
    }

    async cancel(id: number, userId: string): Promise<EventWithAddress | null> {
        await this.findOwnedEventOrFail(id, userId);

        const event = await prisma.event.findUnique({
            where: { id },
            ...eventWithAddressQuery,
        });

        if (!event) return null;

        if (event?.status !== 'CANCELLED') {
            const updateEvent = await prisma.event.update({
                where: { id },
                data: { status: 'CANCELLED' },
                ...eventWithAddressQuery,
            });
            return toEventWithAddress(updateEvent);
        }

        return toEventWithAddress(event);
    }

    /**
     *  Dans la méthode `remove`, deux opérations d'écriture doivent être exécutées ensemble :
     *
     *      1. supprimer les notifications liées à l'événement ;
     *      2. supprimer l'évènement lui-même.
     *
     *  `$transaction` permet d'exécuter ces opérations de manière simultané :
     *      Soit toutes les suppressions sont validées.
     *      Soit aucune n'est conservée.
     *
     *  Si une seule des deux opérations réussit, la base peut se retrouver dans un état incohérent.
     *
     *  Pour résumer :
     *      La transaction est utile car la suppression réelle repose sur plusieurs opérations dépendantes.
     *      Sans la transaction, une panne ou une erreur entre les deux étapes pourrait laisser la BDD dans un état partiellement modifié.
     */
    async remove(id: number, userId: string): Promise<void> {
        await this.findOwnedEventOrFail(id, userId);

        const event = await prisma.event.findUnique({
            where: { id },
            ...eventWithAddressQuery,
        });

        if (!event) throw new NotFoundException('Event Not found');

        await prisma.$transaction(async (transaction) => {
            await transaction.notification.deleteMany({
                where: {
                    reference_id: id,
                    type: 'EVENT',
                },
            });

            await transaction.event.delete({
                where: { id },
            });
        });
    }
}
