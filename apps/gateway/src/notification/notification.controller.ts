import {
    Controller,
    DefaultValuePipe,
    Get,
    HttpCode,
    Param,
    ParseIntPipe,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    Req,
    Res,
} from '@nestjs/common';
import { Readable } from 'node:stream';
import type { Request, Response } from 'express';
import type { NotificationDto, UnreadCountDto } from '@app/contracts';
import { AccessToken } from '../ms-auth/decorators/access-token.decorator';
import { MsNotificationClient } from './ms-notification.client';

/**
 * Notifications in-app (la cloche) : relais vers ms-notification-java. Réservé aux utilisateurs
 * connectés ; ms-notification-java revérifie le token de son côté.
 */
@Controller('notifications')
export class NotificationController {
    constructor(private readonly msNotificationClient: MsNotificationClient) {}

    @Get()
    list(
        @AccessToken() accessToken: string,
        @Query('page', new DefaultValuePipe(0), ParseIntPipe) page: number,
    ): Promise<NotificationDto[]> {
        return this.msNotificationClient.list(accessToken, page);
    }

    /**
     * Les nouvelles notifications, poussées en Server-Sent Events par ms-notification-java. On
     * relaie le flux tel quel (pas de `@Sse()` : il attend un Observable, alors qu'il suffit ici de
     * brancher un flux sur l'autre). Quand le Front se déconnecte, on coupe la connexion vers
     * ms-notification, sinon il garderait un flux ouvert vers personne.
     */
    @Get('stream')
    async stream(
        @AccessToken() accessToken: string,
        @Req() request: Request,
        @Res() response: Response,
    ): Promise<void> {
        const upstream = new AbortController();
        request.on('close', () => upstream.abort());

        const body = await this.msNotificationClient.stream(
            accessToken,
            upstream.signal,
        );

        response.set({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            // Désactive la mise en tampon d'un éventuel proxy (nginx) devant la Gateway.
            'X-Accel-Buffering': 'no',
        });
        response.flushHeaders();

        Readable.fromWeb(body)
            // Coupure (abort ci-dessus, service arrêté) : on termine la réponse, le Front se
            // reconnectera. Sans ce handler, l'erreur non gérée ferait tomber la Gateway.
            .on('error', () => response.end())
            .pipe(response);
    }

    /** Le badge de la cloche, chargé à l'ouverture de la page et à chaque (re)connexion du flux. */
    @Get('unread-count')
    unreadCount(@AccessToken() accessToken: string): Promise<UnreadCountDto> {
        return this.msNotificationClient.unreadCount(accessToken);
    }

    @Patch(':id/read')
    @HttpCode(204)
    markRead(
        @AccessToken() accessToken: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<void> {
        return this.msNotificationClient.markRead(accessToken, id);
    }

    @Post('read-all')
    @HttpCode(204)
    markAllRead(@AccessToken() accessToken: string): Promise<void> {
        return this.msNotificationClient.markAllRead(accessToken);
    }
}
