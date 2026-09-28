import { ParticipantDetailsDto, participationStatusLabel } from '@app/contracts';
import { participationStatusColor } from './participationStatus';
import { TransitionAction } from '../hooks/use_participationTransition';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Flex } from '@/components/layout/flex';
import { Separator } from '@/components/ui/separator';

type HandleParticipantItemProps = {
    participations: ParticipantDetailsDto[];
    isFull: boolean;
    onAction: (action: TransitionAction, participationId: number) => void;
};

export function HandleParticipantItem({
    participations,
    isFull,
    onAction,
}: Readonly<HandleParticipantItemProps>) {
    if (participations.length === 0) {
        return (
            <p className="text-sm italic text-muted-foreground">Aucune participation à gérer.</p>
        );
    }

    return (
        <ul className="flex flex-col gap-3">
            {participations.map((p, index) => {
                const initials = [p.first_name, p.last_name]
                    .filter(Boolean)
                    .map((n) => n![0].toUpperCase())
                    .join('');

                return (
                    <li key={p.id} className="flex flex-col gap-3">
                        {/* Identité + statut */}
                        <Flex justify="between" align="start">
                            <Flex align="center" gap="3" className="min-w-0">
                                <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarImage src={p.avatar_url ?? undefined} />
                                    <AvatarFallback className="text-xs">
                                        {initials || '?'}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="flex min-w-0 flex-col">
                                    <span className="truncate text-sm font-medium">
                                        {p.first_name} {p.last_name}
                                    </span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        {p.email}
                                    </span>
                                </div>
                            </Flex>

                            <Badge variant="outline" className={participationStatusColor[p.status]}>
                                {participationStatusLabel[p.status]}
                            </Badge>
                        </Flex>

                        {/* Actions */}
                        <Flex justify="end" gap="2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onAction('accept', p.id)}
                                disabled={p.status === 'ACCEPTED' || isFull}
                            >
                                Accepter
                            </Button>

                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onAction('reject', p.id)}
                                disabled={p.status === 'ACCEPTED'}
                                className="border-amber-200 text-amber-700 hover:bg-amber-50"
                            >
                                Refuser
                            </Button>

                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onAction('cancel', p.id)}
                                disabled={p.status === 'REJECTED'}
                                className="border-red-200 text-red-700 hover:bg-red-50"
                            >
                                Annuler
                            </Button>
                        </Flex>

                        {/* Séparateur entre items, sauf le dernier */}
                        {index < participations.length - 1 && <Separator />}
                    </li>
                );
            })}
        </ul>
    );
}
