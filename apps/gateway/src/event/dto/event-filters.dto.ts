import { EVENT_STATUS, EventStatus } from '@app/contracts';
import { Transform, Type } from 'class-transformer';
import {
    IsOptional,
    IsArray,
    IsDateString,
    IsIn,
    IsNumber,
    IsString,
    IsInt,
    Min,
    Max,
    MaxLength,
} from 'class-validator';

/** Plafond de `limit` : une page ne peut pas ramener toute la table. */
export const MAX_EVENTS_PAGE_SIZE = 50;

/** Rayon maximal de la recherche autour d'un point (le curseur du Front va de 0 à 100 km). */
export const MAX_DISTANCE_KM = 100;

export class EventFiltersDto {
    @IsOptional()
    @Transform(({ value }: { value: unknown }): EventStatus[] | undefined => {
        if (value == null) return undefined;
        return (Array.isArray(value) ? value : [value]) as EventStatus[];
    })
    @IsArray()
    @IsIn(EVENT_STATUS, { each: true })
    statuses?: EventStatus[];

    @IsOptional()
    @IsString()
    city?: string;

    /** Recherche texte dans le titre et la description (insensible à la casse, via la collation MySQL). */
    @IsOptional()
    @IsString()
    @MaxLength(100)
    search?: string;

    /** Date ISO 8601 (le Front envoie `YYYY-MM-DD`). */
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(MAX_EVENTS_PAGE_SIZE)
    limit?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(MAX_DISTANCE_KM)
    distanceKm?: number;
}
