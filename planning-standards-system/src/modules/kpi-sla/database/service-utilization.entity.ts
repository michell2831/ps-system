import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * Task 9 criterion 4 — Service Utilization.
 *
 * Quarterly aggregated transaction counts per service, submitted by EMS
 * (Architectural Contract B3 — "PSS receives and stores aggregated counts").
 * Displayed read-only on the SLA Computation Monitor page, e.g.
 *   "Good Moral Certificate: 47 transactions, Q1 2026".
 *
 * Unique on (service_name, quarter, year) so re-submissions upsert rather
 * than create duplicates.
 */
@Entity('service_utilization')
@Unique('uq_service_utilization_period', ['service_name', 'quarter', 'year'])
export class ServiceUtilization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_utilization_service_id')
  @Column({ nullable: true })
  service_id: string;

  @Column({ length: 300 })
  service_name: string;

  @Column({ length: 100, nullable: true })
  office: string;

  /** e.g. 'Q1', 'Q2', 'Q3', 'Q4'. */
  @Column({ length: 10 })
  quarter: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int', default: 0 })
  transaction_count: number;

  /** Which system submitted the count (e.g. 'EMS'). */
  @Column({ length: 50, nullable: true })
  source: string;

  @CreateDateColumn({ type: 'timestamptz' })
  received_at: Date;
}
