import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { KpiCategory, KpiUnit } from '../enums';

@Entity('kpi')
export class Kpi {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  office: string;

  @Column({ length: 100, nullable: true })
  sub_office: string;

  @Index('idx_kpi_service_id')
  @Column({ nullable: true })
  service_id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'enum', enum: KpiCategory })
  category: KpiCategory;

  @Column({ type: 'numeric', precision: 10, scale: 4 })
  target_value: number;

  @Column({ type: 'enum', enum: KpiUnit })
  unit: KpiUnit;

  @Column({ type: 'text', nullable: true })
  measurement_basis: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ length: 100 })
  created_by: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}