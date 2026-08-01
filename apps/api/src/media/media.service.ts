import { randomUUID } from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Repository } from 'typeorm';
import { MediaAsset } from './media-asset.entity';
import { R2_CLIENT } from './r2-client.provider';

type MediaAssetKind = MediaAsset['kind'];

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(MediaAsset)
    private readonly mediaAssets: Repository<MediaAsset>,
    @Inject(R2_CLIENT)
    private readonly r2: S3Client,
    private readonly config: ConfigService,
  ) {}

  async upload(
    file: Express.Multer.File,
    kind: MediaAssetKind = 'uploaded',
  ): Promise<MediaAsset> {
    // Matches blobStore.ts's existing idb:/gen:/s3: ref prefix convention on
    // the frontend - same string doubles as the R2 object key, no separate
    // key<->ref mapping needed.
    const storageKey = `s3:${randomUUID()}`;

    await this.r2.send(
      new PutObjectCommand({
        Bucket: this.config.get<string>('R2_BUCKET_NAME'),
        Key: storageKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const asset = this.mediaAssets.create({
      ownerId: null,
      kind,
      storageKey,
      mimeType: file.mimetype,
      sizeBytes: String(file.size),
    });
    return this.mediaAssets.save(asset);
  }

  publicUrl(asset: MediaAsset): string {
    const base = this.config.get<string>('R2_PUBLIC_URL')!;
    return `${base.replace(/\/$/, '')}/${asset.storageKey}`;
  }

  findAll(): Promise<MediaAsset[]> {
    return this.mediaAssets.find({ order: { createdAt: 'ASC' } });
  }

  async findOne(id: string): Promise<MediaAsset> {
    const asset = await this.mediaAssets.findOneBy({ id });
    if (!asset) throw new NotFoundException(`Media asset ${id} not found`);
    return asset;
  }

  async remove(id: string): Promise<void> {
    const asset = await this.findOne(id);
    await this.r2.send(
      new DeleteObjectCommand({
        Bucket: this.config.get<string>('R2_BUCKET_NAME'),
        Key: asset.storageKey,
      }),
    );
    await this.mediaAssets.remove(asset);
  }
}
