import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MyParticipationDto } from '@app/contracts';
import { ParticipationsApi } from '../api/participation.api';
import { useAuthStore } from '../../auth/store/auth.store';
import { queryKeys } from '../../../shared/tanstack/QueryKeys';
import { toastMutation } from '../../../shared/utils/useToastMutation';

/** The logged-in user's participations ("Mes missions"). */
export function useMyParticipations() {
    const { accessToken } = useAuthStore();

    return useQuery({
        queryKey: queryKeys.myParticipations,
        queryFn: () => ParticipationsApi.mine(),
        enabled: !!accessToken,
    });
}

/** Cancels one of the user's participations, then refreshes the page and the slot it was on. */
export function useCancelMyParticipation() {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (participation: MyParticipationDto) =>
            ParticipationsApi.cancel(participation.id),
        onSuccess: async (_, participation) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKeys.myParticipations }),
                queryClient.invalidateQueries({ queryKey: queryKeys.slot(participation.slot.id) }),
                queryClient.invalidateQueries({
                    queryKey: queryKeys.mission(participation.mission.id),
                }),
                queryClient.invalidateQueries({
                    queryKey: queryKeys.event(participation.event.id),
                }),
            ]);
        },
    });

    const cancel = (participation: MyParticipationDto) =>
        toastMutation(mutation.mutateAsync(participation), {
            loading: 'Chargement...',
            success: 'Participation annulée.',
            error: 'Une erreur est survenue, veuillez essayer à nouveau.',
        });

    return { cancel, isPending: mutation.isPending };
}
