import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('presets')
export class Preset {
  // Not auto-generated: the frontend mints its own id (a fixture slug for
  // seeded built-ins like "char-ara-geghetsik", or crypto.randomUUID() for
  // user-created presets - see data/presets.ts) rather than the database.
  @PrimaryColumn()
  id: string;

  @Column({ name: 'entity_type' })
  entityType: string;

  @Column({ name: 'owner_id', nullable: true })
  ownerId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner: User | null;

  @Column()
  name: string;

  @Column({ type: 'jsonb' })
  snapshot: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
