import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SlaRule } from './sla-rule.entity';
import { WorkScheduleType } from '../enums';

@Entity('sla_rule_version')
export class SlaRuleVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SlaRule, (r) => r.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sla_rule_id' })
  sla_rule: SlaRule;

  @Column()
  sla_rule_id: string;

  @Column({ type: 'enum', enum: WorkScheduleType })
  work_schedule_type: WorkScheduleType;

  @Column({ type: 'jsonb', nullable: true })
  work_schedule_config: object[] | null;

  @Column({ type: 'time' })
  work_start_time: string;

  @Column({ type: 'time' })
  work_end_time: string;

  @Column({ type: 'int' })
  warn_threshold_pct: number;

  @Column({ type: 'int' })
  overdue_threshold_pct: number;

  @Column({ type: 'int', default: 1 })
  version_number: number;

  @Column({ length: 50, default: 'UPDATE' })
  change_type: string;

  @Column({ type: 'uuid', nullable: true })
  restored_from_version: string | null;

  @Column({ length: 100 })
  changed_by: string;

  @CreateDateColumn({ type: 'timestamptz' })
  changed_at: Date;
}