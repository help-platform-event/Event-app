import { useState } from 'react';
import { Link } from 'react-router';
import { formatInTimeZone } from 'date-fns-tz';
import { fr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { MyParticipationDto, participationStatusLabel } from '@app/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Flex } from '@/components/layout/flex';
import { isActive, participationStatusColor } from './participationStatus';

type MyParticipationItemProps = {
    participation: MyParticipationDto;
    onCancel: (participation: MyParticipationDto) => Promise<unknown>;
    isPending: boolean;
};

/** One participation of the user: mission, slot, status, and cancelling it. */
export function MyParticipationItem({
    participation,
    onCancel,
    isPending,
}: Readonly<MyParticipationItemProps>) {
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const { mission, slot, status } = participation;
    const active = isActive(participation);

    const handleCancel = async () => {
        await onCancel(participation);
        setIsConfirmOpen(false);
    };

    return (
        <li className={active ? 'py-3' : 'py-3 opacity-60'}>
            <Flex justify="between" align="center" gap="3" className="flex-wrap">
                <div className="flex min-w-0 flex-col gap-1">
                    <Link
                        to={`/missions/${mission.id}`}
                        className="truncate text-sm font-medium hover:underline"
                    >
                        {mission.title}
                    </Link>
                    <Flex align="center" gap="2" className="text-sm text-muted-foreground">
                        <CalendarIcon className="h-4 w-4 shrink-0" />
                        <span>
                            {formatInTimeZone(slot.startAt, 'Europe/Paris', 'EEEE d MMMM · HH:mm', {
                                locale: fr,
                            })}
                            {' → '}
                            {formatInTimeZone(slot.endAt, 'Europe/Paris', 'HH:mm')}
                        </span>
                    </Flex>
                </div>

                <Flex align="center" gap="2">
                    <Badge variant="outline" className={participationStatusColor[status]}>
                        {participationStatusLabel[status]}
                    </Badge>
                    {active && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-700 hover:bg-red-50"
                            onClick={() => setIsConfirmOpen(true)}
                            disabled={isPending}
                        >
                            Annuler
                        </Button>
                    )}
                </Flex>
            </Flex>

            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Annuler ma participation</AlertDialogTitle>
                        <AlertDialogDescription>
                            Votre place sur ce créneau de « {mission.title} » sera libérée et
                            l'organisateur sera prévenu. Vous pourrez vous réinscrire s'il reste de
                            la place.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Retour</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancel}>
                            Annuler ma participation
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </li>
    );
}
