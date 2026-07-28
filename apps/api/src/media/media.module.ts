import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaAsset } from './media-asset.entity';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { r2ClientProvider } from './r2-client.provider';

@Module({
  imports: [TypeOrmModule.forFeature([MediaAsset])],
  controllers: [MediaController],
  providers: [MediaService, r2ClientProvider],
})
export class MediaModule {}
