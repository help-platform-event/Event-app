import type { Server } from 'node:http';
import type { Socket } from 'node:net';
import { Logger } from '@nestjs/common';
import { createProxyMiddleware } from 'http-proxy-middleware';

const logger = new Logger('chat-proxy');

/**
 * Relaie les WebSockets de la discussion (`/chat`) vers ms-chat-java (`/ws`). Seules les demandes
 * de passage en WebSocket (évènement `upgrade` du serveur HTTP) sont relayées : un `GET /chat`
 * ordinaire reste une 404 de la Gateway.
 *
 * Pur relais : la Gateway ne lit pas les frames STOMP. L'authentification (token sur le frame
 * CONNECT) et le contrôle d'accès (à l'abonnement) sont faits par ms-chat-java.
 */
export function attachChatProxy(server: Server): void {
    const chatProxy = createProxyMiddleware({
        target: process.env.MS_CHAT_URL ?? 'http://localhost:8086',
        pathFilter: '/chat',
        pathRewrite: { '^/chat': '/ws' },
        on: {
            // ms-chat injoignable : on ferme la connexion, le client STOMP se reconnectera.
            error: (error, _req, socket) => {
                logger.error(`ms-chat injoignable : ${error.message}`);
                (socket as Socket).destroy();
            },
        },
    });

    server.on('upgrade', chatProxy.upgrade);
}
