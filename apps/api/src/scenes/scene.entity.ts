import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('scenes')
export class Scene {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Nullable for now - there's no auth yet, so scenes created in this MVP
  // (a single shared, unowned graph) have no owner. Tighten back to NOT NULL
  // once AuthModule/UsersModule land and real accounts can own scenes.
  @Column({ name: 'owner_id', nullable: true })
  ownerId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner: User | null;

  @Column()
  title: string;

  // Verbatim copy of the frontend's in-memory scene graph shape - see
  // GraphContext.tsx's SceneGraphs (nodes/edges), the source of truth.
  @Column({ type: 'jsonb' })
  graph: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
