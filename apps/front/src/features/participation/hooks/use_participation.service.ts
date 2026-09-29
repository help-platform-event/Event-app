import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../shared/tanstack/QueryKeys';
import { TransitionAction } from './use_participationTransition';
import { ParticipationsApi } from '../api/participation.api';

export const useParticipateMutation = (slotId: number, eventId: number, missionId?: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (slotId: number) => ParticipationsApi.create(slotId),

        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.slot(slotId),
            });

            await queryClient.invalidateQueries({
                queryKey: queryKeys.myParticipations,
            });

            await queryClient.invalidateQueries({
                queryKey: queryKeys.event(eventId),
            });

            if (missionId) {
                await queryClient.invalidateQueries({
                    queryKey: queryKeys.mission(missionId),
                });
            }
        },
    });
};

interface UseParticipationTransitionParams {
    slotId: number;
    missionId: number;
    eventId: number;
}

export function useParticipationUpdate(
    action: TransitionAction,
    { slotId, missionId, eventId }: UseParticipationTransitionParams,
) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (participationId: number) => ParticipationsApi[action](participationId),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: queryKeys.participationsBySlot(slotId),
                }),
                queryClient.invalidateQueries({
                    queryKey: queryKeys.slot(slotId),
                }),
                queryClient.invalidateQueries({
                    queryKey: queryKeys.slots,
                }),
                queryClient.invalidateQueries({
                    queryKey: queryKeys.mission(missionId),
                }),
                queryClient.invalidateQueries({
                    queryKey: queryKeys.event(eventId),
                }),
                queryClient.invalidateQueries({
                    queryKey: queryKeys.myParticipations,
                }),
            ]);
        },
    });
}
