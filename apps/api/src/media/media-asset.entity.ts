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

  @Column({ name: 'owner_id' })
  ownerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

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
