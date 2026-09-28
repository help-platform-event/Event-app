import { MyParticipationDto, ParticipationStatus } from '@app/contracts';

/** Badge colours of a participation's status (organizer's list and "Mes missions"). */
export const participationStatusColor: Record<ParticipationStatus, string> = {
    ACCEPTED: 'bg-green-100 text-green-800 border-green-200',
    PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
    CANCELLED: 'bg-zinc-100 text-zinc-800 border-zinc-200',
};

/** Only a pending or accepted participation can still be cancelled. */
export const isActive = (p: MyParticipationDto) =>
    p.status === 'PENDING' || p.status === 'ACCEPTED';
