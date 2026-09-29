import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { format, isToday } from 'date-fns';
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
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<ChatStatus, string> = {
    connecting: 'Connexion…',
    connected: 'En ligne',
    offline: 'Hors ligne, reconnexion…',
};

/** Consecutive messages of one person closer than this are grouped under one avatar and name. */
const GROUP_GAP_MS = 5 * 60 * 1000;

/** « 14:32 » today, « 28/09 14:32 » before (a fixed time: « 3 minutes ago » would go stale). */
function formatSentAt(sentAt: string): string {
    const date = new Date(sentAt);
    return format(date, isToday(date) ? 'HH:mm' : 'dd/MM HH:mm');
}

/** « Victor est en train d'écrire… », « Victor et Olivia écrivent… », « Plusieurs personnes… ». */
function typingLabel(names: string[]): string {
    if (names.length === 0) return '';
    if (names.length === 1) return `${names[0]} est en train d'écrire…`;
    if (names.length === 2) return `${names[0]} et ${names[1]} écrivent…`;
    return 'Plusieurs personnes écrivent…';
}

function displayName(member: EventMemberDto | undefined): string {
    if (!member) return 'Ancien membre';
    const name = [member.first_name, member.last_name].filter(Boolean).join(' ');
    return name || 'Membre';
}

/**
 * The event's discussion (organizer + accepted volunteers): live messages over WebSocket, the
 * latest 50 on opening. Chat bubbles: mine on the right, the others' on the left with their
 * avatar and name. Enter sends, Shift+Enter adds a line.
 */
export function EventDiscussion({ eventId }: Readonly<{ eventId: number }>) {
    const { messages, status, error, typingUserIds, send, notifyTyping } = useEventChat(eventId);
    const { data: members } = useEventMembers(eventId);
    const { data: me } = useMe();
    const [draft, setDraft] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    // Keep the latest message in view.
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ block: 'end' });
    }, [messages.length]);

    const typingNames = typingUserIds
        .filter((id) => id !== me?.id)
        .map((id) => members?.find((member) => member.id === id)?.first_name || "Quelqu'un");

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

            <div className="flex max-h-[60vh] min-h-48 flex-col overflow-y-auto rounded-lg border p-3">
                {messages.length === 0 && (
                    <p className="m-auto text-sm text-muted-foreground">
                        Aucun message pour l'instant. Lance la discussion !
                    </p>
                )}
                {messages.map((message, index) => {
                    const author = members?.find((member) => member.id === message.senderId);
                    const name = displayName(author);
                    const mine = message.senderId === me?.id;
                    const previous = messages[index - 1];
                    // Messages sent in a row by the same person show their avatar and name once.
                    const grouped =
                        previous?.senderId === message.senderId &&
                        Date.parse(message.sentAt) - Date.parse(previous.sentAt) < GROUP_GAP_MS;
                    return (
                        <div
                            key={message.id}
                            className={cn(
                                'flex gap-2',
                                mine ? 'justify-end' : 'justify-start',
                                grouped ? 'mt-1' : 'mt-3 first:mt-0',
                            )}
                        >
                            {!mine &&
                                (grouped ? (
                                    <div className="w-8 shrink-0" />
                                ) : (
                                    <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                                        <AvatarImage
                                            src={author?.avatar_url ?? undefined}
                                            alt={name}
                                        />
                                        <AvatarFallback className="rounded-lg">
                                            {initialsOf(author ? name : '')}
                                        </AvatarFallback>
                                    </Avatar>
                                ))}
                            <div
                                className={cn(
                                    'flex max-w-[75%] flex-col',
                                    mine ? 'items-end' : 'items-start',
                                )}
                            >
                                {!mine && !grouped && (
                                    <div className="mb-1 flex items-center gap-2 text-xs">
                                        <span className="font-medium">{name}</span>
                                        {author?.role === 'ORGANIZER' && (
                                            <Badge variant="secondary">Organisateur</Badge>
                                        )}
                                    </div>
                                )}
                                <p
                                    className={cn(
                                        'rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap',
                                        mine
                                            ? 'rounded-br-sm bg-primary text-primary-foreground'
                                            : 'rounded-bl-sm bg-muted',
                                    )}
                                >
                                    {message.content}
                                </p>
                                <span className="mt-0.5 text-[11px] text-muted-foreground">
                                    {formatSentAt(message.sentAt)}
                                </span>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Fixed height: the input doesn't jump when the line appears. */}
            <p className="h-4 text-xs text-muted-foreground italic" aria-live="polite">
                {typingLabel(typingNames)}
            </p>

            <div className="flex items-end gap-2">
                <Textarea
                    value={draft}
                    onChange={(event) => {
                        setDraft(event.target.value);
                        if (event.target.value.trim()) notifyTyping();
                    }}
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
