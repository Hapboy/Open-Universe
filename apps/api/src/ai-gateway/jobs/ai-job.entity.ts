import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

// Mirrors packages/shared/src/enums.ts's HIGGSFIELD_JOB_STATUSES - the only
// job-status vocabulary that already exists in the codebase, reused here for
// every provider rather than inventing a second one.
const AI_JOB_STATUSES = [
  'queued',
  'in_progress',
  'completed',
  'failed',
  'nsfw',
] as const;

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

  @Column({ type: 'enum', enum: AI_JOB_STATUSES })
  status: (typeof AI_JOB_STATUSES)[number];

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
