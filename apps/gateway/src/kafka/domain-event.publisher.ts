import {
    Injectable,
    Logger,
    OnApplicationShutdown,
    OnModuleInit,
} from '@nestjs/common';
import { Kafka, Partitioners } from 'kafkajs';
import {
    KAFKA_TOPIC_PARTITIONS,
    KAFKA_TOPICS,
    KafkaTopic,
} from './kafka.topics';

/**
 * Publie les événements métier de la Gateway sur Kafka.
 *
 * - Au démarrage : crée les topics qui manquent (celui qui publie un topic le déclare), puis
 *   connecte le producteur. Kafka est une infrastructure requise, comme la base : s'il est
 *   absent, la Gateway ne démarre pas.
 * - `publish()` est appelé **après** la transaction Prisma et ne lève jamais : la requête HTTP a
 *   déjà réussi en base, un échec d'envoi est seulement journalisé. Ce n'est pas atomique
 *   (crash entre le commit et l'envoi = événement perdu) ; un outbox transactionnel réglerait
 *   ça, hors v1.
 */
@Injectable()
export class DomainEventPublisher
    implements OnModuleInit, OnApplicationShutdown
{
    private readonly logger = new Logger(DomainEventPublisher.name);
    private readonly kafka = new Kafka({
        clientId: 'gateway',
        brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9094').split(','),
    });
    // Même algorithme de partitionnement que le client Java (murmur2) : une clé donnée tombe sur
    // la même partition quel que soit le producteur.
    private readonly producer = this.kafka.producer({
        createPartitioner: Partitioners.DefaultPartitioner,
    });

    async onModuleInit() {
        await this.createMissingTopics();
        await this.producer.connect();
        this.logger.log('Connecté à Kafka');
    }

    async onApplicationShutdown() {
        await this.producer.disconnect();
    }

    async publish(topic: KafkaTopic, key: string, payload: object) {
        try {
            await this.producer.send({
                topic,
                messages: [{ key, value: JSON.stringify(payload) }],
            });
        } catch (err) {
            this.logger.error(
                `Échec de publication sur ${topic} (clé ${key}) : ${(err as Error).message}`,
            );
        }
    }

    /** Seulement ceux qui manquent : kafkajs journalise en ERROR un topic déjà existant. */
    private async createMissingTopics() {
        const admin = this.kafka.admin();
        await admin.connect();
        try {
            const existing = new Set(await admin.listTopics());
            const missing = Object.values(KAFKA_TOPICS).filter(
                (topic) => !existing.has(topic),
            );
            if (missing.length > 0) {
                await admin.createTopics({
                    waitForLeaders: true,
                    topics: missing.map((topic) => ({
                        topic,
                        numPartitions: KAFKA_TOPIC_PARTITIONS,
                    })),
                });
            }
        } finally {
            await admin.disconnect();
        }
    }
}
