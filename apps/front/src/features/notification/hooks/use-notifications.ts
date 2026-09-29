import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import type { NotificationDto, UnreadCountDto } from '@app/contracts';
import { NotificationApi } from '../api/notification.api';
import { useAuthStore } from '../../auth/store/auth.store';
import { queryKeys } from '@/shared/tanstack/QueryKeys';
import { refreshAccessToken } from '@/shared/utils/axios-client';

/** Delay before reconnecting after the stream closes or fails. */
const RECONNECT_DELAY_MS = 5_000;

/** The token was refused: stop this stream, the refreshed token will open a new one. */
class TokenRefusedError extends Error {}

/**
 * The bell's badge. Loaded once, then kept up to date by `useNotificationStream`, which pushes
 * each new notification and reloads the count whenever the stream (re)connects.
 */
export function useUnreadCount() {
    const { accessToken } = useAuthStore();

    return useQuery({
        queryKey: queryKeys.notificationsUnreadCount,
        queryFn: () => NotificationApi.unreadCount(),
        enabled: !!accessToken,
    });
}

/**
 * Listens to the Gateway's Server-Sent Events stream of new notifications (instead of polling).
 * `fetch-event-source` rather than the browser's `EventSource`, which can't send the
 * `Authorization` header.
 *
 * - Each (re)connection reloads the unread count: it catches up on anything sent while the stream
 *   was closed.
 * - A new notification bumps the badge and goes on top of the list (if it's loaded).
 * - The server closes the stream when the access token expires; the next attempt gets a 401,
 *   which refreshes the token, and the new token restarts this effect.
 * - The stream is paused while the tab is hidden and reopened when it's shown again.
 */
export function useNotificationStream() {
    const { accessToken } = useAuthStore();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!accessToken) return;
        const controller = new AbortController();

        fetchEventSource(`${import.meta.env.VITE_API_URL}/notifications/stream`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: controller.signal,
            onopen: async (response) => {
                if (response.ok) {
                    await queryClient.invalidateQueries({
                        queryKey: queryKeys.notificationsUnreadCount,
                    });
                    return;
                }
                if (response.status === 401) {
                    void refreshAccessToken();
                    throw new TokenRefusedError();
                }
                throw new Error(`Notification stream refused (${response.status})`);
            },
            onmessage: (message) => {
                if (message.event !== 'notification') return;
                const notification = JSON.parse(message.data) as NotificationDto;
                queryClient.setQueryData<UnreadCountDto>(
                    queryKeys.notificationsUnreadCount,
                    (current) => current && { count: current.count + 1 },
                );
                queryClient.setQueryData<NotificationDto[]>(
                    queryKeys.notifications,
                    (list) => list && [notification, ...list],
                );
            },
            onclose: () => {
                // Closed by the server (token expired, restart): reconnect through `onerror`.
                throw new Error('Notification stream closed');
            },
            onerror: (error) => {
                if (error instanceof TokenRefusedError) throw error;
                return RECONNECT_DELAY_MS;
            },
        }).catch(() => undefined); // only a refused token ends up here: nothing left to do

        return () => controller.abort();
    }, [accessToken, queryClient]);
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
