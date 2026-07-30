import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { HealthController } from './health/health.controller';
import { User } from './users/user.entity';
import { Scene } from './scenes/scene.entity';
import { ScenesModule } from './scenes/scenes.module';
import { MediaAsset } from './media/media-asset.entity';
import { MediaModule } from './media/media.module';
import { Preset } from './presets/preset.entity';
import { PresetsModule } from './presets/presets.module';
// NarrativeSettings, AiJob entities already exist but aren't registered
// here yet - see the same note in src/database/data-source.ts.

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.local',
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [User, Scene, MediaAsset, Preset],
        synchronize: false,
      }),
    }),
    ScenesModule,
    MediaModule,
    PresetsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
