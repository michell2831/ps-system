import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PendingAuditEvent } from '../database/pending-audit-event.entity';
import { KafkaAuditProducer } from '../../../common/kafka/kafka-audit.producer';

// --------------------------------------------------------------------------
// Payload interface
// --------------------------------------------------------------------------

export interface AuditEventPayload {
    /** Required: short action label, e.g. COMMITMENT_SUBMITTED */
    event_type: string;
    /** Required: user / service that performed the action */
    actor_id: string;
    /** Required: office that owns the affected record */
    office_id: string;
    /** Optional: PK of the affected row */
    resource_id?: string;
    /** Optional: any extra structured data */
    details?: Record<string, any> | null;
    /** Optional: event timestamp */
    timestamp?: string;
    /** Optional: originating request IP */
    ip_address?: string | null;
    /** Optional: ARMS role of the actor */
    actor_role?: string | null;
    /** Optional: ARMS username of the actor */
    actor_username?: string | null;
    /** Optional: which PSS module originated this event */
    service_name?: string | null;
}

// --------------------------------------------------------------------------
// Service
// --------------------------------------------------------------------------

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(
        @InjectRepository(PendingAuditEvent, 'commitment_db')
        private readonly auditRepo: Repository<PendingAuditEvent>,
        private readonly kafkaProducer: KafkaAuditProducer,
    ) {}

    /**
     * Fire-and-forget audit logger.
     *
     * - Never throws – DB failures are caught and logged so the main
     *   request flow is never interrupted.
     * - Validates required fields before writing; skips silently when
     *   data is unusable.
     * - Accepts undefined / null / empty payloads gracefully.
     *
     * NOTE (Sprint 5, TT5 — Transactional Outbox Pattern, PM-confirmed):
     * log() intentionally does NOT call ARMS/Kafka directly. Writing the
     * row here with is_synced=false and letting AuditDispatcherService
     * deliver it asynchronously (with a real broker ACK before marking
     * synced) is what guarantees zero audit-log loss if ARMS/Kafka is
     * temporarily unreachable. Do not re-add a direct Kafka call here —
     * that reintroduces the original fire-and-forget data-loss bug this
     * pattern was built to fix.
     */
    async log(payload: AuditEventPayload | null | undefined): Promise<void> {
        try {
            // ── Guard: reject null / undefined payload entirely ───────────
            if (!payload) {
                this.logger.warn('AuditService.log: received null/undefined payload, skipping');
                return;
            }

            // ── Guard: normalise & trim required string fields ────────────
            const event_type     = typeof payload.event_type     === 'string' ? payload.event_type.trim()     : '';
            const actor_id  = typeof payload.actor_id  === 'string' ? payload.actor_id.trim()  : '';
            const office_id = typeof payload.office_id === 'string' ? payload.office_id.trim() : '';

            if (!event_type || !actor_id || !office_id) {
                this.logger.warn(
                    'AuditService.log: missing required field(s) ' +
                    `[event_type="${event_type}" actor_id="${actor_id}" office_id="${office_id}"], skipping insert`,
                );
                return;
            }

            // ── Guard: truncate fields that exceed column limits ──────────
            const safeStr = (v: string | undefined | null, max: number): string | null =>
                typeof v === 'string' ? v.trim().substring(0, max) : null;

            // ── Guard: validate metadata is a plain object or null ────────
            let safeMetadata: Record<string, any> | null = null;
            if (payload.details !== null && payload.details !== undefined) {
                if (typeof payload.details === 'object' && !Array.isArray(payload.details)) {
                    safeMetadata = payload.details;
                } else {
                    this.logger.warn('AuditService.log: details is not a plain object, storing null');
                }
            }

            if (payload.actor_username) {
                safeMetadata = {
                    ...(safeMetadata ?? {}),
                    actor_username: payload.actor_username,
                };
            }

            const timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();

            await this.auditRepo.save(
                this.auditRepo.create({
                    event:         event_type.substring(0, 100),
                    actor_id:      actor_id.substring(0, 100),
                    actor_role:    safeStr(payload.actor_role, 50),
                    office_id:     office_id.substring(0, 100),
                    target_entity: undefined,
                    target_id:     safeStr(payload.resource_id, 100)     ?? undefined,
                    metadata:      safeMetadata,
                    ip_address:    safeStr(payload.ip_address, 100),
                    is_synced:     false,
                    timestamp,
                }),
            );

            // ── TT5 Transactional Outbox: Direct Kafka call disabled ───────
            // Delivery is handled exclusively by AuditDispatcherService's scheduled cycle
            // to ensure broker ACK is confirmed before marking is_synced=true.
            /*
            void this.kafkaProducer.emit({
                serviceName: safeStr(payload.service_name, 100) ?? 'pss-commitment',
                entityType:  'unknown',
                entityId:    safeStr(payload.resource_id, 100) ?? undefined,
                userRole:    safeStr(payload.actor_role, 50) ?? 'STAFF',
                userName:    safeStr(payload.actor_username, 100) ?? actor_id,
                userId:      actor_id,
                action:      event_type,
                ipAddress:   safeStr(payload.ip_address, 100) ?? undefined,
                office:      office_id,
                metadata:    safeMetadata ?? undefined,
            });
            */
        } catch (err: unknown) {
            // Log but NEVER re-throw – audit must never crash the caller
            this.logger.error(
                'AuditService.log: failed to persist audit event',
                err instanceof Error ? err.stack : String(err),
            );
        }
    }

    /**
     * Returns all audit events matching the supplied filters.
     * All filter fields are optional; pass an empty object for all rows.
     */
    async findAll(filters: {
        is_synced?: boolean;
        event?: string;
        office_id?: string;
    }): Promise<PendingAuditEvent[]> {
        try {
            const query = this.auditRepo.createQueryBuilder('a');

            if (filters.is_synced !== undefined) {
                query.andWhere('a.is_synced = :is_synced', { is_synced: filters.is_synced });
            }
            if (filters.event) {
                query.andWhere('a.event = :event', { event: filters.event });
            }
            if (filters.office_id) {
                query.andWhere('a.office_id = :office_id', { office_id: filters.office_id });
            }

            return await query.orderBy('a.timestamp', 'DESC').getMany();
        } catch (err: unknown) {
            this.logger.error(
                'AuditService.findAll: query failed',
                err instanceof Error ? err.stack : String(err),
            );
            return [];
        }
    }

    /**
     * Marks a single event as synced after the central audit service
     * has consumed it.
     */
    async markSynced(id: string): Promise<{ message: string }> {
        try {
            if (!id || typeof id !== 'string') {
                return { message: 'Invalid id supplied' };
            }
            await this.auditRepo.update(id, { is_synced: true });
            return { message: `Audit event ${id} marked as synced` };
        } catch (err: unknown) {
            this.logger.error(
                `AuditService.markSynced: failed for id=${id}`,
                err instanceof Error ? err.stack : String(err),
            );
            return { message: `Failed to mark audit event ${id} as synced` };
        }
    }
}
