import { SettingsList } from '@app/contracts';

export const queryKeys = {
    events: ['events'] as const,
    event: (id: number) => ['events', id] as const,
    myEvents: ['events', 'mine'] as const,
    eventMembers: (id: number) => ['events', id, 'members'] as const,

    missions: ['missions'] as const,
    mission: (id: number) => ['missions', id] as const,

    slots: ['slots'] as const,
    slot: (id: number) => ['slots', id] as const,

    settings: ['settings'] as const,
    setting: (setting: SettingsList) => ['settings', setting] as const,

    participationsBySlot: (slotId: number) => ['participations', 'slot', slotId] as const,
    myParticipations: ['participations', 'me'] as const,

    me: ['me'] as const,

    notifications: ['notifications'] as const,
    notificationsUnreadCount: ['notifications', 'unread-count'] as const,
};
