import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { SlaRuleVersion } from './sla-rule-version.entity';
import { WorkScheduleType } from '../enums';

@Index('uq_active_sla_rule_per_office', ['office'], {
  unique: true,
  where: '"is_active" = true',
})
@Entity('sla_rule')
export class SlaRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  office: string;

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

  @Column({ default: true })
  is_active: boolean;

  @Column({ length: 100 })
  created_by: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @OneToMany(() => SlaRuleVersion, (v) => v.sla_rule)
  versions: SlaRuleVersion[];
}