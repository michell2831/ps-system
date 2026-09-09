import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

/**
 * Entity: PendingAuditEvent
 *
 * Maps to the `pending_audit_events` table (created by migration
 * 1749340800000-CreatePendingAuditEvents).
 *
 * All fields mirror the migration columns exactly.  The entity is
 * consumed by AuditService and AuditController in the commitment module.
 *
 * NOTE: synchronize is set to `false` in production app.module.ts
 * (migrations only), so this entity definition must stay in sync with
 * the migration manually.
 */
@Entity('pending_audit_events')
export class PendingAuditEvent {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** Short action label, e.g. COMMITMENT_SUBMITTED */
    @Column({ length: 100 })
    event: string;

    /** User / service that triggered the action */
    @Column({ length: 100 })
    actor_id: string;

    /** ARMS role of the actor, e.g. ADMIN, PLANNING_OFFICER, STAFF */
    @Column({ type: 'varchar', length: 50, nullable: true })
    actor_role: string | null;

    /** Office that owns the affected record */
    @Index('idx_pae_office_id')
    @Column({ length: 100 })
    office_id: string;

    /** TypeORM entity class name, e.g. Commitment */
    @Column({ length: 100, nullable: true })
    target_entity: string;

    /** PK of the affected record */
    @Column({ length: 100, nullable: true })
    target_id: string;

    /** Originating subsystem, defaults to PSS */
    @Column({ length: 50, default: 'PSS' })
    subsystem: string;

    /** Arbitrary extra data – nullable so empty payloads are accepted */
    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any> | null;

    /** False until the central audit service picks it up */
    @Index('idx_pae_is_synced')
    @Column({ default: false })
    is_synced: boolean;

    /** Request IP, optional */
    @Column({ length: 100, nullable: true })
    ip_address: string | null;

    /** Row creation time – maps to the `timestamp` column */
    @CreateDateColumn({ name: 'timestamp', type: 'timestamptz' })
    timestamp: Date;
}