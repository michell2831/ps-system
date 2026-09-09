import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Service } from './service.entity';

/**
 * Audit log for SERVICE changes.
 *
 * Each row captures a single field change (field_changed, old_value, new_value).
 * A multi-field update produces multiple rows sharing the same changed_at timestamp.
 */
@Entity('service_version')
export class ServiceVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Service, (s) => s.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service: Service;

  @Index('idx_service_version_service_id')
  @Column()
  service_id: string;

  @Column({ length: 100 })
  field_changed: string;

  @Column({ type: 'text', nullable: true })
  old_value: string | null;

  @Column({ type: 'text', nullable: true })
  new_value: string | null;

  @Column({ length: 100 })
  changed_by: string;

  @Index('idx_service_version_changed_at')
  @CreateDateColumn({ type: 'timestamptz' })
  changed_at: Date;
}