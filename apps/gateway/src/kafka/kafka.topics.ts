/**
 * Topics Kafka publiés par la Gateway (consommés par ms-notification-java). Chaque message a pour
 * clé le `recipientUserId` : toutes les notifications d'un même utilisateur tombent sur la même
 * partition, donc dans l'ordre.
 */
export const KAFKA_TOPICS = {
    PARTICIPATION_REQUESTED: 'event.participation.requested',
    PARTICIPATION_DECIDED: 'event.participation.decided',
    PARTICIPATION_CANCELLED: 'event.participation.cancelled',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];

/** Même partitionnement que les topics `auth.*` de ms-auth-java. */
export const KAFKA_TOPIC_PARTITIONS = 3;
