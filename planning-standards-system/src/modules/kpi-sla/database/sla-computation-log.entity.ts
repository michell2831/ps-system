import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Task 9 (SLA Computation Monitor) + Task 10 criterion 8.
 *
 * One row per SLA computation result. PSS logs its own computation results
 * (Architectural Contract B2). This table is WRITTEN by the SLA computation
 * engine (BE1, Task 10 — `POST /api/sla/compute`) and READ, read-only, by the
 * SLA Computation Monitor page (Task 9).
 *
 * BE2 owns the table + the read endpoint. BE1 owns the write/algorithm.
 */
@Entity('sla_computation_log')
export class SlaComputationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The EMS transaction this computation corresponds to. */
  @Index('idx_sla_log_transaction_id')
  @Column({ length: 100 })
  transaction_id: string;

  @Index('idx_sla_log_service_id')
  @Column({ nullable: true })
  service_id: string;

  /** Denormalised for display on the monitor page. */
  @Column({ length: 300, nullable: true })
  service_name: string;

  @Index('idx_sla_log_office')
  @Column({ length: 100, nullable: true })
  office: string;

  @Column({ type: 'timestamptz' })
  time_in: Date;

  @Column({ type: 'timestamptz' })
  time_out: Date;

  /** Output of the SLA engine (working-day duration). */
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  computed_duration_days: number;

  /** The SLA target the computation was measured against. */
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  sla_target_days: number;

  /** OPCR score 1–5 (integer). NOT a boolean compliant/non-compliant flag. */
  @Column({ type: 'smallint', nullable: true })
  opcr_score: number;

  @Index('idx_sla_log_evaluated_at')
  @CreateDateColumn({ type: 'timestamptz' })
  evaluated_at: Date;
}
