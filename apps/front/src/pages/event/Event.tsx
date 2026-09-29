import { useNavigate } from 'react-router';
import { useGetMyEvents } from '../../features/event/hooks/use_event.service';
import { CardEventImage } from '@/components/card-event-image';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { Grid } from '@/components/layout/grid';

export default function Event() {
    const navigate = useNavigate();

    // Tous les évènements de l'organisateur, pas seulement ceux de la première page de la Home.
    const { data } = useGetMyEvents();
    const myEvents = data && [...data].sort((a, b) => b.status.localeCompare(a.status));

    return (
        <div>
            <Button variant="outline" size="sm" onClick={() => navigate('/events/create')}>
                <PlusIcon className="mr-1 h-4 w-4" />
                Créer un évènement
            </Button>
            <div className="p-4">
                <Grid cols={3}>
                    {myEvents?.map((event) => (
                        <CardEventImage key={event.id} eventData={event} />
                    ))}
                </Grid>
            </div>
        </div>
    );
}
