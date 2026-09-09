import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Service } from './service.entity';

@Entity('na_flag')
export class NaFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Service, (s) => s.na_flags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service: Service;

  @Column()
  service_id: string;

  @Column()
  period_id: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ length: 100 })
  flagged_by: string;

  @CreateDateColumn({ type: 'timestamptz' })
  flagged_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  removed_at: Date;
}