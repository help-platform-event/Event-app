import { ParticipationStatus } from '@app/contracts';

export interface ParticipationWithStatusAndOrganizer {
    userId: string;
    status: ParticipationStatus;
    slotId: number;
    event: {
        organizerId: string;
    };
}

/**
 * Participation + de quoi décrire l'événement publié sur Kafka après une transition
 * (titre de l'événement, début du créneau).
 */
export interface ParticipationContext extends ParticipationWithStatusAndOrganizer {
    event: {
        id: number;
        title: string;
        organizerId: string;
    };
    slotStartAt: Date;
}
