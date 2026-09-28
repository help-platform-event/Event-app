import type { MyParticipationDto } from '@app/contracts';
import { api } from '../../../shared/utils/axios-client';

export const ParticipationsApi = {
    create: async (slotId: number) => await api.post(`slots/${slotId}/participate`),
    accept: async (id: number) => await api.post(`/participations/${id}/accept`),
    reject: async (id: number) => await api.post(`/participations/${id}/reject`),
    cancel: async (id: number) => await api.post(`/participations/${id}/cancel`),
    mine: async () => (await api.get<MyParticipationDto[]>('me/participations')).data,
};
