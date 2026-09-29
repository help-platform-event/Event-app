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
    UseGuards,
} from '@nestjs/common';
import type { NotificationDto, UnreadCountDto } from '@app/contracts';
import { AccessToken } from '../ms-auth/decorators/access-token.decorator';
import { AuthenticatedGuard } from '../ms-auth/guard/authenticated.guard';
import { MsNotificationClient } from './ms-notification.client';

/**
 * Notifications in-app (la cloche) : relais vers ms-notification-java. Réservé aux utilisateurs
 * connectés ; ms-notification-java revérifie le token de son côté.
 */
@Controller('notifications')
@UseGuards(AuthenticatedGuard)
export class NotificationController {
    constructor(private readonly msNotificationClient: MsNotificationClient) {}

    @Get()
    list(
        @AccessToken() accessToken: string,
        @Query('page', new DefaultValuePipe(0), ParseIntPipe) page: number,
    ): Promise<NotificationDto[]> {
        return this.msNotificationClient.list(accessToken, page);
    }

    /** Appelée toutes les 30 s par le Front (polling) pour le badge de la cloche. */
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
