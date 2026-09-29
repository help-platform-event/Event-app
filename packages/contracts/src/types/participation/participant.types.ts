export enum ParticipationStatusEnum {
	PENDING = "PENDING",
	ACCEPTED = "ACCEPTED",
	REJECTED = "REJECTED",
	CANCELLED = "CANCELLED",
}

export enum ParticipationActions {
	ACCEPT = "ACCEPT",
	REJECT = "REJECT",
	CANCEL = "CANCEL",
}

export const participationStatusLabel: Record<ParticipationStatus, string> = {
	ACCEPTED: "Accepté",
	PENDING: "En attente",
	REJECTED: "Rejeté",
	CANCELLED: "Annulé",
};

export type ParticipationStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";

export interface ParticipantDto {
	id: number;
	user_id: string;
	slot_id: number;
	status: ParticipationStatus;
}

export interface ParticipantDetailsDto extends ParticipantDto {
	email: string;
	first_name: string | null;
	last_name: string | null;
	avatar_url: string | null;
}

/** One of the logged-in user's participations, with what the "Mes missions" page shows. */
export interface MyParticipationDto {
	id: number;
	status: ParticipationStatus;
	slot: { id: number; startAt: string; endAt: string };
	mission: { id: number; title: string };
	event: { id: number; title: string; startDate: string };
}
