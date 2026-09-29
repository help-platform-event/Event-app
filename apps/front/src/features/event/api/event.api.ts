import type { EventFilters } from '../../../shared/components/UI/filter/eventsFilters.interface';
import { api } from '../../../shared/utils/axios-client';
import {
    EventApiResponse,
    EventCreationFormValues,
    EventDto,
    EventWithAddress,
    PaginatedEventsApiResponse,
} from '@app/contracts';

import qs from 'qs';

export async function getEvents(filters?: EventFilters) {
    const { data } = await api.get<PaginatedEventsApiResponse>(`/events`, {
        params: filters,
        paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'repeat' }),
    });

    return data;
}

/** Tous les évènements de l'organisateur connecté, sans pagination. */
export async function getMyEvents() {
    const { data } = await api.get<EventApiResponse[]>(`/events/my-events`);
    return data;
}

export async function getEventById(id: number) {
    const { data } = await api.get<EventDto>(`/events/${id}?details=true`);
    return data;
}

export async function createEvent(event: EventCreationFormValues) {
    const { data } = await api.post<EventWithAddress>(`/events`, event);

    return data;
}

export async function updateEvent(id: number, event: EventCreationFormValues) {
    const { data } = await api.patch<EventWithAddress>(`/events/${id}`, event);

    return data;
}

export async function deleteEvent(id: number): Promise<void> {
    await api.delete(`/events/${id}`);
}
