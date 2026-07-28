import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  CONFLICT_TYPES,
  CONFLICT_TARGETS,
  STORY_PHASES,
  PACING_VALUES,
  CURVE_TYPES,
  type ConflictType,
  type ConflictTarget,
  type StoryPhase,
  type Pacing,
  type CurveType,
} from '@hayverse/shared';
import { Scene } from './scene.entity';

// STORY_PHASES is an array of { key, label } (the label is UI-only) - the
// enum column only needs the flat key values.
const STORY_PHASE_KEYS = STORY_PHASES.map((phase) => phase.key);

@Entity('narrative_settings')
export class NarrativeSettings {
  @PrimaryColumn({ name: 'scene_id' })
  sceneId: string;

  @OneToOne(() => Scene)
  @JoinColumn({ name: 'scene_id' })
  scene: Scene;

  @Column({ name: 'conflict_type', type: 'enum', enum: CONFLICT_TYPES })
  conflictType: ConflictType;

  @Column({ name: 'conflict_target', type: 'enum', enum: CONFLICT_TARGETS })
  conflictTarget: ConflictTarget;

  @Column({ name: 'story_phase', type: 'enum', enum: STORY_PHASE_KEYS })
  storyPhase: StoryPhase;

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
  pacing: Pacing;

  @Column({
    name: 'lore_revelations',
    type: 'text',
    array: true,
    default: '{}',
  })
  loreRevelations: string[];

  @Column({ name: 'curve_type', type: 'enum', enum: CURVE_TYPES })
  curveType: CurveType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
