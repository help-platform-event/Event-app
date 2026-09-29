import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/tanstack/QueryKeys';
import { ChatApi } from '../api/chat.api';

/** Who can take part in the discussion: used to show each message's author. */
export function useEventMembers(eventId: number) {
    return useQuery({
        queryKey: queryKeys.eventMembers(eventId),
        queryFn: () => ChatApi.members(eventId),
    });
}
