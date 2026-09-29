import { ParticipationWithStatusAndOrganizer } from '../type/participation.types';
import { ParticipationStatus } from '@app/contracts';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

//TODO A mettre dans contracts

export type TransitionName = 'ACCEPT' | 'REJECT' | 'CANCEL';

//TODO Françiser les erreurs

function assertFromStatus(
    p: ParticipationWithStatusAndOrganizer,
    allowed: ParticipationStatus[],
    message: string,
) {
    if (!allowed.includes(p.status)) throw new BadRequestException(message);
}

function assertOrganizer(
    userId: string,
    p: ParticipationWithStatusAndOrganizer,
) {
    if (userId !== p.event.organizerId)
        throw new ForbiddenException('Only organizer can accept or reject');
}

/** Le bénévole peut annuler sa propre inscription, et l'organisateur retirer un bénévole. */
function assertOwnerOrOrganizer(
    userId: string,
    p: ParticipationWithStatusAndOrganizer,
) {
    if (userId !== p.userId && userId !== p.event.organizerId)
        throw new ForbiddenException(
            'Only the participant or the organizer can cancel',
        );
}

export const PARTICIPATION_TRANSITIONS: Record<
    TransitionName,
    {
        toStatus: ParticipationStatus;
        fromStatuses: ParticipationStatus[];
        guard: (userId: string, p: ParticipationWithStatusAndOrganizer) => void;
        decision_at: () => Date | null;
        cancelled_at: () => Date | null;
    }
> = {
    ACCEPT: {
        toStatus: 'ACCEPTED',
        fromStatuses: ['PENDING'],
        guard: (userId, p) => {
            assertOrganizer(userId, p);
            assertFromStatus(
                p,
                ['PENDING'],
                'Cannot accept this participation',
            );
        },
        decision_at: () => new Date(),
        cancelled_at: () => null,
    },
    REJECT: {
        toStatus: 'REJECTED',
        fromStatuses: ['PENDING'],
        guard: (userId, p) => {
            assertOrganizer(userId, p);
            assertFromStatus(
                p,
                ['PENDING'],
                'Cannot reject this participation',
            );
        },
        decision_at: () => new Date(),
        cancelled_at: () => null,
    },
    CANCEL: {
        toStatus: 'CANCELLED',
        fromStatuses: ['PENDING', 'ACCEPTED'],
        guard: (userId, p) => {
            assertOwnerOrOrganizer(userId, p);
            assertFromStatus(
                p,
                ['PENDING', 'ACCEPTED'],
                'Cannot cancel this participation',
            );
        },
        decision_at: () => null,
        cancelled_at: () => new Date(),
    },
};
