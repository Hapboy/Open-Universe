import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Scene } from './scene.entity';

// Mirrors packages/shared/src/enums.ts's CONFLICT_TYPES/CONFLICT_TARGETS/
// STORY_PHASES/PACING_VALUES/CURVE_TYPES - duplicated here for the same
// reason as user.entity.ts's TEAM_SIDES/TEAM_ROLES (see comment there).
const CONFLICT_TYPES = ['physical', 'psychological'] as const;
const CONFLICT_TARGETS = [
  'man_vs_man',
  'man_vs_nature',
  'man_vs_society',
] as const;
const STORY_PHASES = [
  'exposition',
  'inciting',
  'rising',
  'climax',
  'resolution',
] as const;
const PACING_VALUES = ['slow', 'moderate', 'fast', 'action'] as const;
const CURVE_TYPES = ['linear', 'ease_in', 'ease_out', 'ease_in_out'] as const;

@Entity('narrative_settings')
export class NarrativeSettings {
  @PrimaryColumn({ name: 'scene_id' })
  sceneId: string;

  @OneToOne(() => Scene)
  @JoinColumn({ name: 'scene_id' })
  scene: Scene;

  @Column({ name: 'conflict_type', type: 'enum', enum: CONFLICT_TYPES })
  conflictType: (typeof CONFLICT_TYPES)[number];

  @Column({ name: 'conflict_target', type: 'enum', enum: CONFLICT_TARGETS })
  conflictTarget: (typeof CONFLICT_TARGETS)[number];

  @Column({ name: 'story_phase', type: 'enum', enum: STORY_PHASES })
  storyPhase: (typeof STORY_PHASES)[number];

  // Slope percentage (-100 to 100). Present on the frontend's
  // SceneNarrativeSettings (NarrativeContext.tsx) but missing from this
  // table's field list in docs/backend-bootstrap.md - included anyway since
  // dropping it would silently lose real user data once this table replaces
  // localStorage as the source of truth.
  @Column({ name: 'emotional_trend', type: 'int' })
  emotionalTrend: number;

  @Column({ name: 'tension_level', type: 'int' })
  tensionLevel: number;

  @Column({ type: 'enum', enum: PACING_VALUES })
  pacing: (typeof PACING_VALUES)[number];

  @Column({
    name: 'lore_revelations',
    type: 'text',
    array: true,
    default: '{}',
  })
  loreRevelations: string[];

  @Column({ name: 'curve_type', type: 'enum', enum: CURVE_TYPES })
  curveType: (typeof CURVE_TYPES)[number];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
