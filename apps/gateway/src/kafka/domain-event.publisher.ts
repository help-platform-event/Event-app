import {
    Injectable,
    Logger,
    OnApplicationShutdown,
    OnModuleInit,
} from '@nestjs/common';
import { Kafka, Partitioners, Producer } from 'kafkajs';
import {
    KAFKA_TOPIC_PARTITIONS,
    KAFKA_TOPICS,
    KafkaTopic,
} from './kafka.topics';

/**
 * Publie les événements métier de la Gateway sur Kafka (fire-and-forget).
 *
 * À appeler **après** la résolution du `prisma.$transaction` : on ne publie que des faits
 * enregistrés. Ce n'est pas atomique pour autant (crash entre le commit et l'envoi = événement
 * perdu) ; un outbox transactionnel réglerait ça, hors v1.
 *
 * `publish()` ne lève jamais : la requête HTTP a déjà réussi côté base, une panne de Kafka ne
 * doit pas la transformer en erreur. Elle est seulement journalisée.
 */
@Injectable()
export class DomainEventPublisher
    implements OnModuleInit, OnApplicationShutdown
{
    private readonly logger = new Logger(DomainEventPublisher.name);
    private readonly kafka = new Kafka({
        clientId: 'gateway',
        brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9094').split(','),
        // Peu de tentatives : une requête ne doit pas rester bloquée longtemps si Kafka est
        // tombé (même logique que le `max.block.ms=5000` de ms-auth-java).
        retry: { retries: 2 },
    });
    // DefaultPartitioner = murmur2, le même algorithme que le client Java : une clé donnée
    // tombe sur la même partition quel que soit le producteur. Le déclarer explicitement coupe
    // aussi l'avertissement de kafkajs sur le changement de partitionneur par défaut.
    private readonly producer: Producer = this.kafka.producer({
        createPartitioner: Partitioners.DefaultPartitioner,
    });
    private connecting?: Promise<void>;

    /** Connexion au démarrage, sans bloquer ni faire échouer le boot si Kafka est absent. */
    onModuleInit() {
        this.ensureConnected().catch((err: Error) =>
            this.logger.warn(
                `Kafka indisponible au démarrage : ${err.message}`,
            ),
        );
    }

    async onApplicationShutdown() {
        await this.producer.disconnect();
    }

    async publish(topic: KafkaTopic, key: string, payload: object) {
        try {
            await this.ensureConnected();
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

    /**
     * Connexion paresseuse et partagée : un échec est oublié, la publication suivante retente.
     * Crée aussi les topics (3 partitions) s'ils n'existent pas, avant le premier envoi.
     */
    private ensureConnected(): Promise<void> {
        this.connecting ??= this.connect().catch((err: unknown) => {
            this.connecting = undefined;
            throw err;
        });
        return this.connecting;
    }

    private async connect() {
        const admin = this.kafka.admin();
        await admin.connect();
        try {
            // Seulement les topics absents : kafkajs journalise en ERROR la réponse
            // « topic déjà existant » (ms-notification-java les déclare aussi), même inoffensive.
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
        await this.producer.connect();
        this.logger.log('Connecté à Kafka');
    }
}
