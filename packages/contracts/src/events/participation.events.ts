import type { ParticipationStatus } from "../types/participation/participant.types.js";

/*
 * Payloads the Gateway publishes to Kafka (consumed by ms-notification-java). Types only: the
 * topic names live in the Gateway (`src/kafka/kafka.topics.ts`), which imports nothing but types
 * from this package.
 */

/** Fields shared by both participation events. Dates are ISO-8601 strings (UTC). */
interface ParticipationEventBase {
	/** Unique per message: the consumer uses it to ignore a redelivered event. */
	eventId: string;
	occurredAt: string;
	participationId: number;
	/** The user to notify (ms-auth user id). */
	recipientUserId: string;
	/** The user whose action triggered the event. */
	actorUserId: string;
	event: { id: number; title: string };
	slot: { id: number; startAt: string };
}

/** A user asked to join a slot: the event's organizer is notified. */
export type ParticipationRequestedEvent = ParticipationEventBase;

/** The organizer accepted or rejected a request: the participant is notified. */
export interface ParticipationDecidedEvent extends ParticipationEventBase {
	status: Extract<ParticipationStatus, "ACCEPTED" | "REJECTED">;
}
