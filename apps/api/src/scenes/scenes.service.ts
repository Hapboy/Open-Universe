import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scene } from './scene.entity';
import { CreateSceneDto } from './dto/create-scene.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';

@Injectable()
export class ScenesService {
  constructor(
    @InjectRepository(Scene)
    private readonly scenes: Repository<Scene>,
  ) {}

  create(dto: CreateSceneDto): Promise<Scene> {
    const scene = this.scenes.create({
      title: dto.title,
      graph: dto.graph ?? { nodes: [], edges: [] },
      ownerId: dto.ownerId ?? null,
    });
    return this.scenes.save(scene);
  }

  findAll(): Promise<Scene[]> {
    return this.scenes.find({ order: { createdAt: 'ASC' } });
  }

  async findOne(id: string): Promise<Scene> {
    const scene = await this.scenes.findOneBy({ id });
    if (!scene) throw new NotFoundException(`Scene ${id} not found`);
    return scene;
  }

  async update(id: string, dto: UpdateSceneDto): Promise<Scene> {
    const scene = await this.findOne(id);
    Object.assign(scene, dto);
    return this.scenes.save(scene);
  }

  async remove(id: string): Promise<void> {
    const scene = await this.findOne(id);
    await this.scenes.remove(scene);
  }
}
