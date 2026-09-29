import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import { MsNotificationClient } from './ms-notification.client';

function jsonResponse(status: number, body?: unknown): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

describe('MsNotificationClient', () => {
    const fetchMock = jest.fn();
    let client: MsNotificationClient;

    beforeEach(() => {
        process.env.MS_NOTIFICATION_URL = 'http://notification-app:8085';
        global.fetch = fetchMock;
        fetchMock.mockReset();
        client = new MsNotificationClient();
    });

    it('forwards the bearer and returns the unread count', async () => {
        fetchMock.mockResolvedValue(jsonResponse(200, { count: 2 }));

        const result = await client.unreadCount('access');

        expect(result).toEqual({ count: 2 });
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(
            'http://notification-app:8085/api/notifications/unread-count',
        );
        expect(init.method).toBe('GET');
        expect(init.headers.Authorization).toBe('Bearer access');
    });

    it('asks for the requested page of notifications', async () => {
        fetchMock.mockResolvedValue(jsonResponse(200, []));

        await client.list('access', 2);

        expect(fetchMock.mock.calls[0][0]).toBe(
            'http://notification-app:8085/api/notifications?page=2',
        );
    });

    it('turns the 404 of a foreign notification into an HttpException', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse(404, {
                status: 404,
                detail: 'Notification not found',
            }),
        );

        const error = await client
            .markRead('access', '6f1c1b0e-0000-4000-8000-000000000000')
            .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(404);
        expect((error as HttpException).getResponse()).toEqual({
            message: 'Notification not found',
        });
    });

    it('opens the event stream with the bearer and the caller abort signal', async () => {
        const body = new ReadableStream<Uint8Array>();
        fetchMock.mockResolvedValue(
            new Response(body, {
                status: 200,
                headers: { 'Content-Type': 'text/event-stream' },
            }),
        );
        const abort = new AbortController();

        const stream = await client.stream('access', abort.signal);

        expect(stream).toBe(body);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(
            'http://notification-app:8085/api/notifications/stream',
        );
        expect(init.headers).toEqual({
            Accept: 'text/event-stream',
            Authorization: 'Bearer access',
        });
        expect(init.signal).toBe(abort.signal);
    });

    it('turns a refused stream into an HttpException', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse(401, { error: 'Unauthorized', status: 401 }),
        );

        const error = await client
            .stream('expired', new AbortController().signal)
            .catch((e: unknown) => e);

        expect((error as HttpException).getStatus()).toBe(401);
    });

    it('returns 503 when ms-notification is unreachable', async () => {
        fetchMock.mockRejectedValue(new TypeError('fetch failed'));

        await expect(client.markAllRead('access')).rejects.toBeInstanceOf(
            ServiceUnavailableException,
        );
    });
});
