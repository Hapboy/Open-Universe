import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

const MEDIA_ASSET_KINDS = ['uploaded', 'generated'] as const;

@Entity('media_assets')
export class MediaAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Nullable for now - same reasoning as Scene.ownerId (see scene.entity.ts):
  // no auth yet, tighten back to NOT NULL once accounts exist.
  @Column({ name: 'owner_id', nullable: true })
  ownerId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner: User | null;

  @Column({ type: 'enum', enum: MEDIA_ASSET_KINDS })
  kind: (typeof MEDIA_ASSET_KINDS)[number];

  // The MediaModule's own s3:<uuid> ref convention (Phase G) - slots into
  // blobStore.ts's existing idb:/gen: prefix scheme on the frontend.
  @Column({ name: 'storage_key' })
  storageKey: string;

  @Column({ name: 'mime_type' })
  mimeType: string;

  // bigint columns come back from the pg driver as strings, not numbers -
  // JS numbers can't safely represent every bigint value.
  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
