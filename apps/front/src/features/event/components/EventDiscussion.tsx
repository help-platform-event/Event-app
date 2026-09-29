import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { EventMemberDto } from '@app/contracts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useMe } from '@/features/auth/hooks/use_auth.service';
import { useEventChat, type ChatStatus } from '@/features/chat/hooks/use-event-chat';
import { useEventMembers } from '@/features/chat/hooks/use-event-members';
import { CHAT_MESSAGE_MAX_LENGTH } from '@/features/chat/types/chat.types';
import { initialsOf } from '@/shared/utils/initials';

const STATUS_LABEL: Record<ChatStatus, string> = {
    connecting: 'Connexion…',
    connected: 'En ligne',
    offline: 'Hors ligne, reconnexion…',
};

function displayName(member: EventMemberDto | undefined): string {
    if (!member) return 'Ancien membre';
    const name = [member.first_name, member.last_name].filter(Boolean).join(' ');
    return name || 'Membre';
}

/**
 * The event's discussion (organizer + accepted volunteers): live messages over WebSocket, the
 * latest 50 on opening. Enter sends, Shift+Enter adds a line.
 */
export function EventDiscussion({ eventId }: Readonly<{ eventId: number }>) {
    const { messages, status, error, send } = useEventChat(eventId);
    const { data: members } = useEventMembers(eventId);
    const { data: me } = useMe();
    const [draft, setDraft] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    // Keep the latest message in view.
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ block: 'end' });
    }, [messages.length]);

    const connected = status === 'connected';
    const canSend = connected && draft.trim().length > 0;

    const submit = () => {
        if (canSend && send(draft.trim())) setDraft('');
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            submit();
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">{STATUS_LABEL[status]}</p>
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex max-h-[60vh] min-h-48 flex-col gap-3 overflow-y-auto rounded-lg border p-3">
                {messages.length === 0 && (
                    <p className="m-auto text-sm text-muted-foreground">
                        Aucun message pour l'instant. Lance la discussion !
                    </p>
                )}
                {messages.map((message) => {
                    const author = members?.find((member) => member.id === message.senderId);
                    const name = displayName(author);
                    const mine = message.senderId === me?.id;
                    return (
                        <div
                            key={message.id}
                            className={`flex gap-2 rounded-md p-2 ${mine ? 'bg-muted' : ''}`}
                        >
                            <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarImage src={author?.avatar_url ?? undefined} alt={name} />
                                <AvatarFallback className="rounded-lg">
                                    {initialsOf(author ? name : '')}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex min-w-0 flex-col gap-0.5">
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <span className="font-medium">{mine ? 'Moi' : name}</span>
                                    {author?.role === 'ORGANIZER' && (
                                        <Badge variant="secondary">Organisateur</Badge>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(message.sentAt), {
                                            addSuffix: true,
                                            locale: fr,
                                        })}
                                    </span>
                                </div>
                                <p className="text-sm break-words whitespace-pre-wrap">
                                    {message.content}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            <div className="flex items-end gap-2">
                <Textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={handleKeyDown}
                    maxLength={CHAT_MESSAGE_MAX_LENGTH}
                    placeholder="Écrire un message…"
                    aria-label="Message"
                    disabled={!connected}
                />
                <Button onClick={submit} disabled={!canSend}>
                    Envoyer
                </Button>
            </div>
        </div>
    );
}
