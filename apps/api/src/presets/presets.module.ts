import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Preset } from './preset.entity';
import { PresetsController } from './presets.controller';
import { PresetsService } from './presets.service';

@Module({
  imports: [TypeOrmModule.forFeature([Preset])],
  controllers: [PresetsController],
  providers: [PresetsService],
})
export class PresetsModule {}
