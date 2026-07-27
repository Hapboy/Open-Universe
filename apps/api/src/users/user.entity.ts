import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Mirrors packages/shared/src/enums.ts's TEAM_SIDES/TEAM_ROLES. apps/api
// can't import that package directly - it's kept out of the npm workspace so
// Bun can manage it independently (see docs/backend-bootstrap.md Phase D) -
// so these value lists are duplicated here and must be kept in sync by hand.
const TEAM_SIDES = ['urvakan', 'rambalkoshe', 'moct'] as const;
const TEAM_ROLES = ['Режиссер', 'Разработчик', 'Художник', 'Стилист'] as const;

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
  side: (typeof TEAM_SIDES)[number];

  @Column({ type: 'enum', enum: TEAM_ROLES })
  role: (typeof TEAM_ROLES)[number];

  @Column({ name: 'timeline_duration_seconds', type: 'int', default: 60 })
  timelineDurationSeconds: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
