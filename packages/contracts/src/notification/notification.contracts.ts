/** An in-app notification (the bell), as served by ms-notification-java through the Gateway. */
export interface NotificationDto {
	id: string;
	title: string;
	message: string;
	/** ISO-8601 (UTC). */
	createdAt: string;
	read: boolean;
}

export interface UnreadCountDto {
	count: number;
}
