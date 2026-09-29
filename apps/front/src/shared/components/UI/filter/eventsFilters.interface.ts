import { EventStatus } from '@app/contracts';

export interface EventFilters {
    statuses?: EventStatus[];
    startDate?: string;
    endDate?: string;
    city?: string;
    /** Recherche texte (titre, description), faite par la Gateway. */
    search?: string;
    distanceKm?: number;
    latitude?: number;
    longitude?: number;
    page?: number;
    limit?: number;
}
