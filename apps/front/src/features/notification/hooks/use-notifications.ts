import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NotificationApi } from '../api/notification.api';
import { useAuthStore } from '../../auth/store/auth.store';
import { queryKeys } from '@/shared/tanstack/QueryKeys';

/** How often the bell asks the Gateway for the unread count (polling). */
const POLL_INTERVAL_MS = 30_000;

/**
 * The bell's badge. Polling: React Query re-runs the request every 30 s, and pauses while the tab
 * is hidden (`refetchIntervalInBackground` is false by default).
 */
export function useUnreadCount() {
    const { accessToken } = useAuthStore();

    return useQuery({
        queryKey: queryKeys.notificationsUnreadCount,
        queryFn: () => NotificationApi.unreadCount(),
        enabled: !!accessToken,
        refetchInterval: POLL_INTERVAL_MS,
    });
}

/** The list itself, only loaded while the menu is open. */
export function useNotifications(open: boolean) {
    const { accessToken } = useAuthStore();

    return useQuery({
        queryKey: queryKeys.notifications,
        queryFn: () => NotificationApi.list(),
        enabled: open && !!accessToken,
    });
}

/** Both mutations refresh the list and the badge (they share the `notifications` key prefix). */
function useInvalidateNotifications() {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
}

export function useMarkRead() {
    const invalidate = useInvalidateNotifications();

    return useMutation({
        mutationFn: (id: string) => NotificationApi.markRead(id),
        onSuccess: invalidate,
    });
}

export function useMarkAllRead() {
    const invalidate = useInvalidateNotifications();

    return useMutation({
        mutationFn: () => NotificationApi.markAllRead(),
        onSuccess: invalidate,
    });
}
