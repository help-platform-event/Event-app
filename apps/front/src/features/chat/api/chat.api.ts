import type { EventMemberDto } from '@app/contracts';
import { api } from '../../../shared/utils/axios-client';

export class ChatApi {
    /** The event's organizer and accepted volunteers (403 for anyone else). */
    static async members(eventId: number): Promise<EventMemberDto[]> {
        const { data } = await api.get<EventMemberDto[]>(`events/${eventId}/members`);
        return data;
    }
}
