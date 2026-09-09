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

@Entity('commitment_version')
export class CommitmentVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Commitment, (c) => c.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'commitment_id' })
  commitment: Commitment;

  @Index('idx_commitment_version_commitment')
  @Column()
  commitment_id: string;

  @Column({ type: 'int' })
  version_number: number;

  @Column({ length: 50 })
  status: string;

  @Column({ type: 'text', nullable: true })
  revision_reason: string;

  @Column({ length: 100 })
  revised_by: string;

  @CreateDateColumn({ type: 'timestamptz' })
  revised_at: Date;

  @Column({ type: 'jsonb', nullable: true })
  snapshot: Record<string, any>;
}
