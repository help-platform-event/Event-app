import type { NotificationDto, UnreadCountDto } from '@app/contracts';
import { api } from '../../../shared/utils/axios-client';

export class NotificationApi {
    static async list(): Promise<NotificationDto[]> {
        const { data } = await api.get<NotificationDto[]>('notifications');
        return data;
    }

    static async unreadCount(): Promise<UnreadCountDto> {
        const { data } = await api.get<UnreadCountDto>('notifications/unread-count');
        return data;
    }

    static async markRead(id: string): Promise<void> {
        await api.patch(`notifications/${id}/read`);
    }

    static async markAllRead(): Promise<void> {
        await api.post('notifications/read-all');
    }
}
