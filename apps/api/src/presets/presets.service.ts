import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Preset } from './preset.entity';
import { CreatePresetDto } from './dto/create-preset.dto';
import { UpdatePresetDto } from './dto/update-preset.dto';

@Injectable()
export class PresetsService {
  constructor(
    @InjectRepository(Preset)
    private readonly presets: Repository<Preset>,
  ) {}

  create(dto: CreatePresetDto): Promise<Preset> {
    const preset = this.presets.create({
      entityType: dto.entityType,
      name: dto.name,
      snapshot: dto.snapshot,
      ownerId: dto.ownerId ?? null,
    });
    return this.presets.save(preset);
  }

  findAll(entityType?: string): Promise<Preset[]> {
    return this.presets.find({
      where: entityType ? { entityType } : {},
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Preset> {
    const preset = await this.presets.findOneBy({ id });
    if (!preset) throw new NotFoundException(`Preset ${id} not found`);
    return preset;
  }

  async update(id: string, dto: UpdatePresetDto): Promise<Preset> {
    const preset = await this.findOne(id);
    Object.assign(preset, dto);
    return this.presets.save(preset);
  }

  async remove(id: string): Promise<void> {
    const preset = await this.findOne(id);
    await this.presets.remove(preset);
  }
}
