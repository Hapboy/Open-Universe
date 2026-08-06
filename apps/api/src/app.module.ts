import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { HealthController } from './health/health.controller';
import { User } from './users/user.entity';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { Scene } from './scenes/scene.entity';
import { ScenesModule } from './scenes/scenes.module';
import { MediaAsset } from './media/media-asset.entity';
import { MediaModule } from './media/media.module';
import { Preset } from './presets/preset.entity';
import { PresetsModule } from './presets/presets.module';
import { AiJob } from './ai-gateway/jobs/ai-job.entity';
import { AiGatewayModule } from './ai-gateway/ai-gateway.module';
import { PinterestConnection } from './pinterest/pinterest-connection.entity';
import { PinterestModule } from './pinterest/pinterest.module';
// NarrativeSettings entity already exists but isn't registered here yet -
// see the same note in src/database/data-source.ts.

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
        entities: [User, Scene, MediaAsset, Preset, AiJob, PinterestConnection],
        synchronize: false,
      }),
    }),
    // Connection is a plain options object, not a pre-built ioredis
    // instance - BullMQ only closes connections it creates itself, so
    // handing it a live client (as this used to) left the process unable
    // to exit (e2e tests hung after passing) since nothing ever called
    // .quit() on it. maxRetriesPerRequest: null is BullMQ's own
    // requirement, not optional - see
    // https://docs.bullmq.io/guide/going-to-production#maxretriesperrequest
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = new URL(config.get<string>('REDIS_URL')!);
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port),
            username: url.username || undefined,
            password: url.password || undefined,
            tls: url.protocol === 'rediss:' ? {} : undefined,
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
    UsersModule,
    AuthModule,
    ScenesModule,
    MediaModule,
    PresetsModule,
    AiGatewayModule,
    PinterestModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
