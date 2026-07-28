import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  TEAM_SIDES,
  TEAM_ROLES,
  type TeamSide,
  type TeamRole,
} from '@hayverse/shared';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'char_name' })
  charName: string;

  @Column({ type: 'enum', enum: TEAM_SIDES })
  side: TeamSide;

  @Column({ type: 'enum', enum: TEAM_ROLES })
  role: TeamRole;

  @Column({ name: 'timeline_duration_seconds', type: 'int', default: 60 })
  timelineDurationSeconds: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
