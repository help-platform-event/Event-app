import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import type { Request, Response } from 'express';
import { NotificationController } from './notification.controller';
import { MsNotificationClient } from './ms-notification.client';

describe('NotificationController.stream', () => {
    /** A response that collects what is piped into it. */
    function fakeResponse() {
        const sink = new PassThrough();
        const chunks: string[] = [];
        sink.on('data', (chunk: Buffer) => chunks.push(chunk.toString()));
        const headers: Record<string, string> = {};
        Object.assign(sink, {
            set: (values: Record<string, string>) =>
                Object.assign(headers, values),
            flushHeaders: jest.fn(),
        });
        return { response: sink as unknown as Response, chunks, headers, sink };
    }

    function setUp() {
        let signal: AbortSignal | undefined;
        let push: (text: string) => void = () => undefined;
        const body = new ReadableStream<Uint8Array>({
            start(controller) {
                push = (text) =>
                    controller.enqueue(new TextEncoder().encode(text));
            },
        });
        const client = {
            stream: jest.fn((_token: string, s: AbortSignal) => {
                signal = s;
                return Promise.resolve(body);
            }),
        };
        const controller = new NotificationController(
            client as unknown as MsNotificationClient,
        );
        const request = new EventEmitter() as unknown as Request;
        return { controller, client, request, push, signal: () => signal };
    }

    it('relays the upstream events as an event stream', async () => {
        const { controller, client, request, push } = setUp();
        const { response, chunks, headers } = fakeResponse();

        await controller.stream('access', request, response);
        push('event:notification\ndata:{"id":"1"}\n\n');
        await new Promise((resolve) => setImmediate(resolve));

        expect(client.stream).toHaveBeenCalledWith('access', expect.anything());
        expect(headers['Content-Type']).toBe('text/event-stream');
        expect(chunks.join('')).toBe('event:notification\ndata:{"id":"1"}\n\n');
    });

    it('closes the upstream connection when the browser goes away', async () => {
        const { controller, request, signal } = setUp();
        const { response } = fakeResponse();

        await controller.stream('access', request, response);
        expect(signal()?.aborted).toBe(false);

        (request as unknown as EventEmitter).emit('close');

        expect(signal()?.aborted).toBe(true);
    });
});
