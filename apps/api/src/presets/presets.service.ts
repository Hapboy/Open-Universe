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

  // Upsert when dto.id is set (a client-minted id from a node's own
  // presetId - see CreatePresetDto): update that row in place if it already
  // exists, otherwise insert it under that id rather than a backend-generated
  // one. This keeps the frontend's local presetId and the backend row's id
  // as the same value across the node's whole lifetime.
  async create(dto: CreatePresetDto): Promise<Preset> {
    if (dto.id) {
      const existing = await this.presets.findOneBy({ id: dto.id });
      if (existing) {
        existing.entityType = dto.entityType;
        existing.name = dto.name;
        existing.snapshot = dto.snapshot;
        return this.presets.save(existing);
      }
    }

    const preset = this.presets.create({
      id: dto.id,
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
