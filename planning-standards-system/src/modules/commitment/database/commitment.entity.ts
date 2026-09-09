import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    Index,
} from 'typeorm';
import { CommitmentStatus } from '../enums';
import { CommitmentItem } from './commitment-item.entity';
import { CommitmentVersion } from './commitment-version.entity';

@Entity('commitment')
export class Commitment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index('idx_commitment_office')
    @Column({ length: 100 })
    office: string;

    @Index('idx_commitment_period')
    @Column()
    period_id: string;

    @Column({ type: 'enum', enum: CommitmentStatus, default: CommitmentStatus.DRAFT })
    status: CommitmentStatus;

    @Column({ type: 'int', default: 1 })
    version_number: number;

    @Column({ length: 100, nullable: true })
    submitted_by: string;

    @Column({ type: 'timestamptz', nullable: true })
    submitted_at: Date;

    @Column({ length: 100, nullable: true })
    locked_by: string;

    @Column({ type: 'timestamptz', nullable: true })
    locked_at: Date;

    @Column({ length: 100 })
    created_by: string;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;

    @OneToMany(() => CommitmentItem, (item) => item.commitment, { cascade: true })
    items: CommitmentItem[];

    @OneToMany(() => CommitmentVersion, (version) => version.commitment)
    versions: CommitmentVersion[];
}