import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Service } from './service.entity';
import { FieldType } from '../enums';

@Entity('intake_field')
export class IntakeField {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Service, (s) => s.intake_fields, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service: Service;

  @Column()
  service_id: string;

  @Column({ length: 200 })
  label: string;

  @Column({ type: 'enum', enum: FieldType })
  field_type: FieldType;

  @Column({ default: false })
  is_required: boolean;

  @Column({ type: 'int', default: 0 })
  display_order: number;

  @Column({ type: 'jsonb', nullable: true })
  dropdown_options: string[];

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}