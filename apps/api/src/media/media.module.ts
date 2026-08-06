import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MediaAsset } from './media-asset.entity';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { r2ClientProvider } from './r2-client.provider';

@Module({
  // AuthModule - makes JwtAuthGuard resolvable (same reason
  // PinterestModule imports it), routes here are guard-protected now.
  imports: [TypeOrmModule.forFeature([MediaAsset]), AuthModule],
  controllers: [MediaController],
  providers: [MediaService, r2ClientProvider],
})
export class MediaModule {}
