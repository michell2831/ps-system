import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  Index,
  Unique,
} from 'typeorm';
import { ServiceVersion } from './service-version.entity';
import { IntakeField } from './service-intake-field.entity';
import { NaFlag } from './service-na-flag.entity';
import { ServiceMode } from './service-mode.entity';
import { ServiceStatus, SlaUnit, ReferralStatus } from '../enums';

@Entity('service')
@Unique('uq_service_office_name_mode', ['office', 'name', 'service_mode'])
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  office: string;

  @Column({ length: 100, nullable: true })
  sub_office: string;

  @Index('idx_service_name')
  @Column({ length: 300 })
  name: string;

  @Index('idx_service_mode')
  @Column({ type: 'varchar', length: 150, nullable: true })
  service_mode: string | null;

  // Task 4: was `@Column({ type: 'enum', enum: ServiceClassification })`.
  // Converted to free text so offices outside Medical (Registrar, OSAS,
  // etc.) aren't forced into Simple/Complex/Highly Technical — they can
  // enter their own variant label, e.g. "Walk-in" or "With Billing Statement".
  @Index('idx_service_classification')
  @Column({ type: 'varchar', length: 150, nullable: true })
  classification: string | null;

  @Column({ type: 'int' })
    sla_target_value: number;

  @Column({ type: 'enum', enum: SlaUnit, default: SlaUnit.DAYS })
  sla_target_unit: SlaUnit;

  @Column({ length: 200 })
  responsible_unit: string;

  @Column({ type: 'enum', enum: ReferralStatus, default: ReferralStatus.WITH })
  with_referral: ReferralStatus;

  @Column({ type: 'jsonb', nullable: true, default: '[]' })
  required_documents: string[];

  @Column({ type: 'jsonb', nullable: true, default: '[]' })
  processing_steps: string[];

  @Column({ type: 'text', nullable: true })
  expected_output: string;

  @Index('idx_service_status')
  @Column({ type: 'enum', enum: ServiceStatus, default: ServiceStatus.ACTIVE })
  status: ServiceStatus;

  @Column({ type: 'timestamptz', nullable: true })
  archived_at: Date;

  @Column({ length: 100, nullable: true })
  archived_by: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ length: 100 })
  created_by: string;

  @OneToMany(() => ServiceVersion, (v) => v.service)
  versions: ServiceVersion[];

  @OneToMany(() => IntakeField, (f) => f.service)
  intake_fields: IntakeField[];

  @OneToMany(() => NaFlag, (n) => n.service)
  na_flags: NaFlag[];

  @ManyToMany(() => ServiceMode)
  @JoinTable({
    name: 'service_service_modes',
    joinColumn: { name: 'service_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'mode_id', referencedColumnName: 'id' },
  })
  modes: ServiceMode[];
}