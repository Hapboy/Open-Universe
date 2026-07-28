import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  HIGGSFIELD_JOB_STATUSES,
  type HiggsfieldJobStatus,
} from '@hayverse/shared';
import { User } from '../../users/user.entity';

@Entity('ai_jobs')
export class AiJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column()
  provider: string;

  @Column()
  kind: string;

  // HIGGSFIELD_JOB_STATUSES is the only job-status vocabulary that already
  // exists in the codebase, reused here for every provider rather than
  // inventing a second one.
  @Column({ type: 'enum', enum: HIGGSFIELD_JOB_STATUSES })
  status: HiggsfieldJobStatus;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
