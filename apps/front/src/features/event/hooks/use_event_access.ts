import { useMe } from '../../auth/hooks/use_auth.service';
import { useMyParticipations } from '../../participation/hooks/use_my_participations';

/**
 * Whether the user may see an event's members area (the Documents and Discussion tabs): its
 * organizer, or a volunteer with at least one participation ACCEPTED on one of its slots.
 *
 * Display only: these tabs have no data yet. Each feature will check access server-side when it
 * exists (e.g. the discussion chat).
 */
export function useCanAccessEventMembersArea(event: {
    id: number;
    organizer_id: number | string;
}): boolean {
    const { data: user } = useMe();
    const { data: participations } = useMyParticipations();

    if (!user) return false;
    if (String(event.organizer_id) === String(user.id)) return true;

    return (participations ?? []).some((p) => p.event.id === event.id && p.status === 'ACCEPTED');
}
