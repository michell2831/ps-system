import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Commitment } from './commitment.entity';
import { CommitmentItemUnit } from '../enums';

@Entity('commitment_item')
export class CommitmentItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Commitment, (c) => c.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'commitment_id' })
  commitment: Commitment;

  @Index('idx_commitment_item_commitment')
  @Column()
  commitment_id: string;

  @Index('idx_commitment_item_service')
  @Column()
  service_id: string;

  @Index('idx_commitment_item_kpi')
  @Column()
  kpi_id: string;

  @Column({ type: 'numeric', precision: 10, scale: 4, nullable: true })
  target_value: number;

  @Column({ type: 'enum', enum: CommitmentItemUnit, default: CommitmentItemUnit.COUNT })
  unit: CommitmentItemUnit;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
