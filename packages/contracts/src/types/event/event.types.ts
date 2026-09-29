import { MissionDetailsDto, MissionDto } from "../mission/mission.type.js";
import { SlotDto } from "../slot/slot.types.js";
import { AddressDto } from "@app/contracts";

export const EVENT_STATUS = ["OPEN", "CANCELLED", "DRAFT", "CLOSED"] as const;
export type EventStatus = (typeof EVENT_STATUS)[number];

export const eventStatusOptions: EventStatus[] = ["OPEN", "CANCELLED", "DRAFT", "CLOSED"];

export const eventStatusLabel: Record<EventStatus, string> = {
	DRAFT: "Brouillon",
	OPEN: "Ouvert",
	CLOSED: "Fermé",
	CANCELLED: "Annulé",
};

export const eventStatusColor: Record<EventStatus, string> = {
	OPEN: "bg-green-100 text-green-800 border-green-200",
	CLOSED: "bg-zinc-100 text-zinc-800 border-zinc-200",
	DRAFT: "bg-amber-100 text-amber-800 border-amber-200",
	CANCELLED: "bg-red-100 text-red-800 border-red-200",
};

export interface EventDto {
	id: number;
	organizer_id: number | string;
	title: string;
	description: string;
	program: string;
	start_date: Date;
	end_date: Date;
	address: AddressDto;
	status: EventStatus;
	missions: MissionDetailsDto[];
}

export interface EventWithAddress {
	id: number;
	organizer_id: number | string;
	title: string;
	description: string;
	program: string;
	start_date: Date;
	end_date: Date;
	status: EventStatus;
	address: AddressDto;
}

export class PaginatedEventsDto {
	items: EventWithAddress[];
	total: number;
	page: number;
	limit: number;
}

export interface EventMissionDto extends MissionDto {
	slots: SlotDto[];
}

export interface CreateEventInput {
	title: string;
	description: string;
	program: string;
	start_date: string;
	end_date: string;
	address: AddressDto;
	status: EventStatus;
}

export interface UpdateEventInput {
	title?: string;
	description?: string;
	program?: string;
	start_date?: string;
	end_date?: string;
	address?: AddressDto;
	status?: EventStatus;
}

export interface EventApiResponse {
	id: number;
	title: string;
	description: string;
	program: string;
	start_date: Date;
	end_date: Date;
	organizer_id: string;
	address: {
		street_name: string;
		street_number: string;
		address_line_2?: string;
		city: string;
		country: string;
		postal_code: string;
		coordinates_lat: number;
		coordinates_lon: number;
	};
	status: EventStatus;
}

// Type pagination générique
export interface Paginated<T> {
	items: T[];
	total: number;
	page: number;
	limit: number;
}

// Type attendu depuis le backend
export type PaginatedEventsApiResponse = Paginated<EventApiResponse>;

// type frontend paginé
export type PaginatedEvents = Paginated<EventWithAddress>;

/**
 * A member of an event: its organizer, or a volunteer with an accepted participation. Only
 * members may see an event's members area (Documents, Discussion).
 */
export interface EventMemberDto {
	id: string;
	first_name: string | null;
	last_name: string | null;
	avatar_url: string | null;
	role: "ORGANIZER" | "VOLUNTEER";
}
