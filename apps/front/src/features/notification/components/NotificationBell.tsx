import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    useMarkAllRead,
    useMarkRead,
    useNotificationStream,
    useNotifications,
    useUnreadCount,
} from '../hooks/use-notifications';

/** Header bell: unread badge (kept live by the SSE stream) and the latest notifications in a menu. */
export function NotificationBell() {
    useNotificationStream();
    const [open, setOpen] = useState(false);
    const { data: unread, refetch: refetchUnreadCount } = useUnreadCount();
    const { data: notifications, isLoading } = useNotifications(open);
    const markRead = useMarkRead();
    const markAllRead = useMarkAllRead();

    const count = unread?.count ?? 0;

    // Opening the menu loads a fresh list: refresh the badge too, so both always agree.
    const handleOpenChange = (next: boolean) => {
        setOpen(next);
        if (next) void refetchUnreadCount();
    };

    return (
        <DropdownMenu open={open} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    aria-label={count > 0 ? `${count} notifications non lues` : 'Notifications'}
                >
                    <Bell />
                    {count > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full px-1 tabular-nums">
                            {count > 9 ? '9+' : count}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    Notifications
                    {count > 0 && (
                        <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0"
                            onClick={() => markAllRead.mutate()}
                        >
                            Tout marquer comme lu
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {isLoading && (
                    <p className="px-2 py-3 text-sm text-muted-foreground">Chargement…</p>
                )}

                {!isLoading && !notifications?.length && (
                    <p className="px-2 py-3 text-sm text-muted-foreground">Aucune notification</p>
                )}

                {notifications?.map((notification) => (
                    <DropdownMenuItem
                        key={notification.id}
                        className="flex flex-col items-start gap-1"
                        onSelect={(event) => {
                            // Keep the menu open: reading a notification shouldn't close the list.
                            event.preventDefault();
                            if (!notification.read) markRead.mutate(notification.id);
                        }}
                    >
                        <span className={notification.read ? '' : 'font-semibold'}>
                            {notification.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {notification.message}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                                addSuffix: true,
                                locale: fr,
                            })}
                        </span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
