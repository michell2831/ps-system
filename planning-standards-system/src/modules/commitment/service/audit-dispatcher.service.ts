import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interval } from '@nestjs/schedule';
import { PendingAuditEvent } from '../database/pending-audit-event.entity';
import { KafkaAuditProducer, ArmsAuditEvent } from '../../../common/kafka/kafka-audit.producer';

/**
 * AuditDispatcherService — TT5, Transactional Outbox Pattern (PM-confirmed design).
 *
 * Every 30 seconds, reads rows from `pending_audit_events` where
 * `is_synced = false` and attempts to publish each to ARMS over the
 * `arms.audit.events` Kafka topic via KafkaAuditProducer.
 *
 * A row is marked `is_synced = true` ONLY after KafkaAuditProducer.emit()
 * confirms the broker acknowledged receipt (see kafka-audit.producer.ts —
 * acks: -1, all in-sync replicas). If Kafka is down, unreachable, or the
 * ACK times out, the row is left `is_synced = false` and is retried on the
 * next cycle. Nothing here ever throws out to the scheduler — one bad
 * event or a down broker must never stop future cycles from running.
 *
 * This replaces the two prior approaches:
 *  - the original inline fire-and-forget Kafka push from AuditService.log()
 *    (lost events silently when Kafka was down — the bug PM flagged), and
 *  - an interim HTTP-polling design (superseded before ever going live —
 *    PM confirmed Kafka, not HTTP, is the required transport).
 */
@Injectable()
export class AuditDispatcherService {
    private readonly logger = new Logger(AuditDispatcherService.name);
    private dispatching = false;
    private static readonly BATCH_SIZE = 50;

    constructor(
        @InjectRepository(PendingAuditEvent, 'commitment_db')
        private readonly auditRepo: Repository<PendingAuditEvent>,
        private readonly kafkaProducer: KafkaAuditProducer,
    ) { }

    @Interval(30_000)
    async dispatchPendingEvents(): Promise<void> {
        if (this.dispatching) {
            this.logger.warn('Previous dispatch cycle still in progress — skipping this tick');
            return;
        }
        this.dispatching = true;
        try {
            await this.runCycle();
        } catch (err: any) {
            this.logger.error(`Unexpected error during audit dispatch cycle: ${err.message}`, err.stack);
        } finally {
            this.dispatching = false;
        }
    }

    private async runCycle(): Promise<void> {
        const pending = await this.auditRepo.find({
            where: { is_synced: false },
            order: { timestamp: 'ASC' },
            take: AuditDispatcherService.BATCH_SIZE,
        });
        if (pending.length === 0) return;

        this.logger.log(`Dispatching ${pending.length} pending audit event(s) to ARMS via Kafka`);

        let acked = 0;
        let failed = 0;
        for (const event of pending) {
            (await this.dispatchOne(event)) ? acked++ : failed++;
        }

        this.logger.log(`Dispatch cycle complete — ACKed: ${acked}, failed/retrying: ${failed}`);
    }

    private async dispatchOne(row: PendingAuditEvent): Promise<boolean> {
        const armsEvent: ArmsAuditEvent = {
            serviceName: 'pss-commitment',
            entityType: row.target_entity ?? 'unknown',
            entityId: row.target_id ?? undefined,
            userRole: row.actor_role ?? (row.metadata as any)?.actor_role ?? 'STAFF',
            userName: (row.metadata as any)?.actor_username ?? row.actor_id,
            userId: row.actor_id,
            action: row.event,
            ipAddress: row.ip_address ?? undefined,
            office: row.office_id,
            metadata: row.metadata ?? undefined,
        };

        const acked = await this.kafkaProducer.emit(armsEvent);
        if (!acked) {
            this.logger.error(
                `No ACK for audit event ${row.id} (${row.event}) — leaving is_synced=false, will retry next cycle`,
            );
            return false;
        }

        await this.auditRepo.update(row.id, { is_synced: true });
        return true;
    }
}
