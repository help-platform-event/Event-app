import { useParams } from 'react-router';
import { useGetEventById } from '../../features/event/hooks/use_event.service';
import { EventDetailsCard } from '../../features/event/components/EventDetailsCard';
import { EventDiscussion } from '../../features/event/components/EventDiscussion';
import { EventDocuments } from '../../features/event/components/EventDocuments';
import { useMe } from '../../features/auth/hooks/use_auth.service';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InfoIcon, DocumentsIcon, DiscussionIcon } from '../../shared/components/UI/icons/icons';
import { AlertColors } from '@/components/alert-colors';
import { LoadingPage } from '@/components/loading-page';

export function EventDetailsPage() {
    const { eventId } = useParams<{ eventId: string }>();
    const { data: user } = useMe();

    const { data: event, isLoading, isError } = useGetEventById(Number(eventId));

    if (isLoading) return <LoadingPage />;

    if (isError || !event) return <AlertColors />;

    const isUser = user?.role === 'USER' || user?.role === 'ADMIN';

    return (
        <Tabs defaultValue="informations">
            <TabsList>
                <TabsTrigger value="informations">
                    <InfoIcon size={16} />
                    Informations
                </TabsTrigger>
                {isUser && (
                    <>
                        <TabsTrigger value="documents">
                            <DocumentsIcon size={16} />
                            Documents
                        </TabsTrigger>
                        <TabsTrigger value="discussion">
                            <DiscussionIcon size={16} />
                            Discussion
                        </TabsTrigger>
                    </>
                )}
            </TabsList>

            <TabsContent value="informations">
                <EventDetailsCard event={event} />
            </TabsContent>

            {isUser && (
                <>
                    <TabsContent value="documents">
                        <EventDocuments />
                    </TabsContent>
                    <TabsContent value="discussion">
                        <EventDiscussion />
                    </TabsContent>
                </>
            )}
        </Tabs>
    );
}
