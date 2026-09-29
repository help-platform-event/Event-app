import { useParams } from 'react-router';
import { useGetEventById } from '../../features/event/hooks/use_event.service';
import { EventDetailsCard } from '../../features/event/components/EventDetailsCard';
import { EventDiscussion } from '../../features/event/components/EventDiscussion';
import { EventDocuments } from '../../features/event/components/EventDocuments';
import { useCanAccessEventMembersArea } from '../../features/event/hooks/use_event_access';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InfoIcon, DocumentsIcon, DiscussionIcon } from '../../shared/components/UI/icons/icons';
import { AlertColors } from '@/components/alert-colors';
import { LoadingPage } from '@/components/loading-page';

export function EventDetailsPage() {
    const { eventId } = useParams<{ eventId: string }>();
    const { data: event, isLoading, isError } = useGetEventById(Number(eventId));
    // Called before the early returns (rules of hooks); a missing event simply has no access.
    const canAccessMembersArea = useCanAccessEventMembersArea(
        event ?? { id: Number(eventId), organizer_id: '' },
    );

    if (isLoading) return <LoadingPage />;

    if (isError || !event) return <AlertColors />;

    return (
        <Tabs defaultValue="informations">
            <TabsList>
                <TabsTrigger value="informations">
                    <InfoIcon size={16} />
                    Informations
                </TabsTrigger>
                {canAccessMembersArea && (
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

            {canAccessMembersArea && (
                <>
                    <TabsContent value="documents">
                        <EventDocuments />
                    </TabsContent>
                    <TabsContent value="discussion">
                        {/* key: another event gets a fresh discussion (messages, connection) */}
                        <EventDiscussion key={event.id} eventId={event.id} />
                    </TabsContent>
                </>
            )}
        </Tabs>
    );
}
