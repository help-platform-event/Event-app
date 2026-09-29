import { Injectable } from '@nestjs/common';
import type { NotificationDto, UnreadCountDto } from '@app/contracts';
import { ServiceHttpClient } from '../utils/http/service-http-client';

/**
 * Client HTTP vers ms-notification-java. Le bearer de l'utilisateur est transmis tel quel : le
 * service le vérifie lui-même et ne renvoie que les notifications de cet utilisateur.
 */
@Injectable()
export class MsNotificationClient {
    private readonly http = new ServiceHttpClient(
        'ms-notification',
        process.env.MS_NOTIFICATION_URL ?? 'http://localhost:8085',
        'Le service de notifications est indisponible.',
    );

    list(accessToken: string, page: number): Promise<NotificationDto[]> {
        return this.http.request('GET', `/api/notifications?page=${page}`, {
            accessToken,
        });
    }

    /** Le flux SSE des nouvelles notifications de l'utilisateur. */
    stream(
        accessToken: string,
        signal: AbortSignal,
    ): Promise<ReadableStream<Uint8Array>> {
        return this.http.openStream(
            '/api/notifications/stream',
            accessToken,
            signal,
        );
    }

    unreadCount(accessToken: string): Promise<UnreadCountDto> {
        return this.http.request('GET', '/api/notifications/unread-count', {
            accessToken,
        });
    }

    async markRead(accessToken: string, id: string): Promise<void> {
        await this.http.request(
            'PATCH',
            `/api/notifications/${encodeURIComponent(id)}/read`,
            { accessToken },
        );
    }

    async markAllRead(accessToken: string): Promise<void> {
        await this.http.request('POST', '/api/notifications/read-all', {
            accessToken,
        });
    }
}
