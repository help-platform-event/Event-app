import { EventStatus } from '@app/contracts';
import { Transform, Type } from 'class-transformer';
import {
    IsOptional,
    IsArray,
    IsString,
    IsInt,
    Min,
    Max,
    MaxLength,
} from 'class-validator';

/** Plafond de `limit` : une page ne peut pas ramener toute la table. */
export const MAX_EVENTS_PAGE_SIZE = 50;

export class EventFiltersDto {
    @IsOptional()
    @Transform(({ value }: { value: unknown }): EventStatus[] | undefined => {
        if (value == null) return undefined;
        return (Array.isArray(value) ? value : [value]) as EventStatus[];
    })
    @IsArray()
    statuses?: EventStatus[];

    @IsOptional()
    @IsString()
    city?: string;

    /** Recherche texte dans le titre et la description (insensible à la casse, via la collation MySQL). */
    @IsOptional()
    @IsString()
    @MaxLength(100)
    search?: string;

    @IsOptional()
    startDate?: string;

    @IsOptional()
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
    latitude?: number;

    @IsOptional()
    @Type(() => Number)
    longitude?: number;

    @IsOptional()
    @Type(() => Number)
    distanceKm?: number;
}
