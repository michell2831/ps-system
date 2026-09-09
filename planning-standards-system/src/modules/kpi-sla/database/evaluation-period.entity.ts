import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { PeriodType, PeriodStatus } from '../enums';

@Entity('evaluation_period')
export class EvaluationPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  office: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'enum', enum: PeriodType })
  period_type: PeriodType;

  @Column({ type: 'date' })
  start_date: string;

  @Column({ type: 'date' })
  end_date: string;

  @Column({ type: 'enum', enum: PeriodStatus, default: PeriodStatus.OPEN })
  status: PeriodStatus;

  @Column({ length: 100 })
  created_by: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date;

  @Column({ length: 100, nullable: true })
  completed_by: string;

  @Column({ default: true })
  is_active: boolean;
}