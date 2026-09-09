import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';

/**
 * ARMS Kafka topic for centralized audit events.
 * Matches `KafkaTopics.ARMS_AUDIT_EVENTS` in opcr-arms `packages/kafka/src/topics.ts`.
 */
export const ARMS_AUDIT_TOPIC = 'arms.audit.events';

/**
 * Matches `IngestAuditEventDto` in opcr-arms `packages/dto/src/audit.dto.ts`.
 */
export interface ArmsAuditEvent {
    serviceName: string;
    entityType: string;
    entityId?: string;
    userRole: string;
    userName: string;
    userId: string;
    action: string;
    ipAddress?: string;
    office?: string;
    metadata?: Record<string, any>;
}

@Injectable()
export class KafkaAuditProducer implements OnModuleDestroy {
    private readonly logger = new Logger(KafkaAuditProducer.name);
    private readonly kafka: Kafka;
    private readonly producer: Producer;
    private connected = false;

    constructor(private readonly config: ConfigService) {
        this.kafka = new Kafka({
            clientId: this.config.get<string>('KAFKA_CLIENT_ID') ?? 'pss-service',
            brokers: [this.config.get<string>('KAFKA_BROKER') ?? 'localhost:9092'],
        });
        this.producer = this.kafka.producer();

        this.producer
            .connect()
            .then(() => {
                this.connected = true;
                this.logger.log('Connected to ARMS Kafka broker');
            })
            .catch((err) => {
                this.logger.warn(
                    `Kafka broker unreachable — audit events will NOT be pushed to ARMS (local pending_audit_event log is unaffected): ${err.message}`,
                );
            });
    }

    /**
     * Publishes an audit event to the ARMS Kafka topic.
     *
     * Waits for acknowledgment from all in-sync replicas (acks: -1).
     * Returns true if ARMS acknowledged receipt, false if the broker is
     * unreachable, not connected, or the request timed out.
     *
     * The caller is responsible for retry/backoff logic (e.g. Transactional
     * Outbox pattern); this method's job is only to report whether ARMS
     * acknowledged receipt.
     */
    async emit(event: ArmsAuditEvent): Promise<boolean> {
        if (!this.connected) {
            this.logger.warn(`Kafka not connected — cannot deliver audit event action=${event.action}`);
            return false;
        }
        try {
            await this.producer.send({
                topic: ARMS_AUDIT_TOPIC,
                messages: [{ value: JSON.stringify(event) }],
                acks: -1,       // wait for ALL in-sync replicas to acknowledge, not just the leader
                timeout: 10_000, // fail fast rather than hang the outbox worker indefinitely
            });
            return true;
        } catch (err: any) {
            this.logger.error(`Failed to deliver audit event to Kafka (no ACK received): ${err.message}`, err.stack);
            return false;
        }
    }

    async onModuleDestroy(): Promise<void> {
        if (this.connected) {
            await this.producer.disconnect();
        }
    }
}
