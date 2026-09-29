import { useCallback, useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { useAuthStore } from '../../auth/store/auth.store';
import { refreshAccessToken } from '@/shared/utils/axios-client';
import { expiresWithin } from '@/shared/utils/jwt';
import type { ChatMessageDto } from '../types/chat.types';

export type ChatStatus = 'connecting' | 'connected' | 'offline';

/** The Gateway relays `/chat` to ms-chat-java's WebSocket. */
const CHAT_URL = `${String(import.meta.env.VITE_API_URL).replace(/^http/, 'ws')}/chat`;

const RECONNECT_DELAY_MS = 5_000;
const HEARTBEAT_MS = 10_000;

/** Adds messages, without duplicates, in the order they were sent (server time). */
function merge(current: ChatMessageDto[], incoming: ChatMessageDto[]): ChatMessageDto[] {
    const byId = new Map(current.map((message) => [message.id, message]));
    incoming.forEach((message) => byId.set(message.id, message));
    return [...byId.values()].sort(
        (a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt) || a.id.localeCompare(b.id),
    );
}

/**
 * An event's discussion over STOMP (WebSocket), through the Gateway.
 *
 * - CONNECT carries the access token (refreshed first if it's about to expire): the browser's
 *   WebSocket can't send an `Authorization` header, a STOMP frame can.
 * - On connection: subscribes to the room (`/topic/events/{id}`, live messages), then asks for the
 *   history (`/app/events/{id}/history`, the latest 50, sent once). Both are merged by id, so a
 *   message never shows twice.
 * - The server closes the connection when the token expires; the client reconnects on its own
 *   after 5 s, with a fresh token. Sending is disabled while not connected, so nothing is lost.
 * - A user who isn't a member gets an ERROR frame: no point retrying, the client stops.
 */
export function useEventChat(eventId: number) {
    const [messages, setMessages] = useState<ChatMessageDto[]>([]);
    const [status, setStatus] = useState<ChatStatus>('connecting');
    const [error, setError] = useState<string | null>(null);
    const clientRef = useRef<Client | null>(null);

    useEffect(() => {
        const client = new Client({
            brokerURL: CHAT_URL,
            reconnectDelay: RECONNECT_DELAY_MS,
            heartbeatIncoming: HEARTBEAT_MS,
            heartbeatOutgoing: HEARTBEAT_MS,
            beforeConnect: async () => {
                let token = useAuthStore.getState().accessToken;
                if (!token || expiresWithin(token, 30)) token = await refreshAccessToken();
                client.connectHeaders = { Authorization: `Bearer ${token}` };
            },
            onConnect: () => {
                setStatus('connected');
                setError(null);
                client.subscribe(`/topic/events/${eventId}`, (frame) => {
                    const message = JSON.parse(frame.body) as ChatMessageDto;
                    setMessages((current) => merge(current, [message]));
                });
                client.subscribe(`/app/events/${eventId}/history`, (frame) => {
                    const history = JSON.parse(frame.body) as ChatMessageDto[];
                    setMessages((current) => merge(current, history));
                });
                client.subscribe('/user/queue/errors', (frame) => setError(frame.body));
            },
            onWebSocketClose: () => setStatus('offline'),
            onStompError: (frame) => {
                const reason = frame.headers.message ?? '';
                if (reason.startsWith('Not a member')) {
                    setError("Tu n'as pas accès à cette discussion.");
                    void client.deactivate();
                } else if (reason.includes('try again')) {
                    setError('Discussion momentanément indisponible, nouvelle tentative…');
                }
                // Token errors: the next attempt's beforeConnect refreshes it.
            },
        });
        client.activate();
        clientRef.current = client;

        return () => {
            clientRef.current = null;
            void client.deactivate();
        };
    }, [eventId]);

    const send = useCallback(
        (content: string) => {
            const client = clientRef.current;
            if (!client?.connected) return false;
            client.publish({
                destination: `/app/events/${eventId}/messages`,
                body: JSON.stringify({ content }),
            });
            return true;
        },
        [eventId],
    );

    return { messages, status, error, send };
}
