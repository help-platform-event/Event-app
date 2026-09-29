import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from '@tanstack/react-query';
import {
    createEvent,
    deleteEvent,
    getEventById,
    getEvents,
    getMyEvents,
    updateEvent,
} from '../api/event.api';
import type { EventFilters } from '../../../shared/components/UI/filter/eventsFilters.interface';
import { EventMapper } from '../mapper/EventMapper';
import {
    EventCreationFormValues,
    EventDto,
    EventWithAddress,
    PaginatedEvents,
} from '@app/contracts';
import { queryKeys } from '../../../shared/tanstack/QueryKeys';

//Lecture
export function useGetEvents(filters?: EventFilters): UseQueryResult<PaginatedEvents, Error> {
    return useQuery({
        queryKey: ['events', filters],
        queryFn: async () => {
            const res = await getEvents(filters);

            return {
                items: res.items.map((e) => EventMapper.toEvent(e)),
                total: res.total,
                page: res.page,
                limit: res.limit,
            };
        },
        // Garde la page affichée pendant le chargement de la suivante (pas de clignotement).
        placeholderData: keepPreviousData,
    });
}

/** Les évènements de l'organisateur connecté (page « Mes évènements »). */
export function useGetMyEvents(): UseQueryResult<EventWithAddress[], Error> {
    return useQuery({
        queryKey: queryKeys.myEvents,
        queryFn: async () => (await getMyEvents()).map((e) => EventMapper.toEvent(e)),
    });
}

export function useGetEventById(id: number): UseQueryResult<EventDto, Error> {
    return useQuery({
        queryKey: queryKeys.event(id),
        queryFn: () => getEventById(id),
        enabled: !!id,
    });
}

//Ecriture
export function useCreateEvent(): UseMutationResult<
    EventWithAddress,
    Error,
    EventCreationFormValues
> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createEvent,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: queryKeys.events });
        },
        onError: (error) => {
            console.error('Échec de la création :', error.message);
        },
    });
}

export function useUpdateEvent(): UseMutationResult<
    EventWithAddress,
    Error,
    { id: number; data: EventCreationFormValues }
> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (variables) => updateEvent(variables.id, variables.data),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: queryKeys.events });
        },
        onError: (error) => {
            console.error('Échec de la mise à jour :', error.message);
        },
    });
}

export function useDeleteEvent(): UseMutationResult<void, Error, { id: number }> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (variables) => deleteEvent(variables.id),
        onSuccess: async (_data, variables) => {
            queryClient.removeQueries({ queryKey: queryKeys.event(variables.id) });
            await queryClient.invalidateQueries({ queryKey: queryKeys.events });
        },
        onError: (error) => {
            console.error('Échec de la suppression :', error.message);
        },
    });
}
