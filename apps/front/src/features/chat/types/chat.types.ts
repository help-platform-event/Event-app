/** A discussion message, as ms-chat-java sends it (`ChatMessageResponse`). */
export interface ChatMessageDto {
    id: string;
    eventId: number;
    senderId: string;
    content: string;
    /** ISO-8601 (UTC). */
    sentAt: string;
}

/** Longest message ms-chat-java accepts. */
export const CHAT_MESSAGE_MAX_LENGTH = 2000;
