import { Link } from 'react-router';
import { formatInTimeZone } from 'date-fns-tz';
import { fr } from 'date-fns/locale';
import { MyParticipationDto } from '@app/contracts';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    useCancelMyParticipation,
    useMyParticipations,
} from '../../features/participation/hooks/use_my_participations';
import { MyParticipationItem } from '../../features/participation/components/MyParticipationItem';
import { isActive } from '../../features/participation/components/participationStatus';

type EventGroup = {
    event: MyParticipationDto['event'];
    participations: MyParticipationDto[];
};

/**
 * Groups the participations by event: events with a participation still pending or accepted come
 * first (soonest first), then those with only cancelled or rejected ones.
 */
function groupByEvent(participations: MyParticipationDto[]): EventGroup[] {
    const groups = new Map<number, EventGroup>();
    for (const p of participations) {
        const group = groups.get(p.event.id) ?? { event: p.event, participations: [] };
        group.participations.push(p);
        groups.set(p.event.id, group);
    }
    const hasActive = (g: EventGroup) => g.participations.some(isActive);
    return [...groups.values()].sort(
        (a, b) =>
            Number(hasActive(b)) - Number(hasActive(a)) ||
            a.event.startDate.localeCompare(b.event.startDate),
    );
}

export default function MyMissionsPage() {
    const { data: participations, isLoading } = useMyParticipations();
    const { cancel, isPending } = useCancelMyParticipation();

    const groups = groupByEvent(participations ?? []);

    return (
        <Container>
            <div className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight">Mes missions</h1>
                <p className="text-sm text-muted-foreground">
                    Les évènements et missions auxquels vous êtes inscrit, et la gestion de vos
                    inscriptions.
                </p>
            </div>

            {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

            {!isLoading && groups.length === 0 && (
                <div className="flex flex-col items-start gap-3">
                    <p className="text-sm italic text-muted-foreground">
                        Vous n'êtes inscrit à aucune mission.
                    </p>
                    <Button variant="outline" size="sm" asChild>
                        <Link to="/">Découvrir les évènements</Link>
                    </Button>
                </div>
            )}

            <div className="flex flex-col gap-6">
                {groups.map(({ event, participations: items }) => (
                    <Card key={event.id}>
                        <CardHeader>
                            <CardTitle>
                                <Link to={`/events/${event.id}`} className="hover:underline">
                                    {event.title}
                                </Link>
                            </CardTitle>
                            <CardDescription>
                                {formatInTimeZone(event.startDate, 'Europe/Paris', 'd MMMM yyyy', {
                                    locale: fr,
                                })}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="flex flex-col divide-y">
                                {items.map((participation) => (
                                    <MyParticipationItem
                                        key={participation.id}
                                        participation={participation}
                                        onCancel={cancel}
                                        isPending={isPending}
                                    />
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </Container>
    );
}
