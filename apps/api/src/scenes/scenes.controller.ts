import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ScenesService } from './scenes.service';
import { CreateSceneDto } from './dto/create-scene.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';
import { Scene } from './scene.entity';

@ApiTags('scenes')
@Controller('scenes')
export class ScenesController {
  constructor(private readonly scenesService: ScenesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a scene' })
  create(@Body() dto: CreateSceneDto): Promise<Scene> {
    return this.scenesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all scenes' })
  findAll(): Promise<Scene[]> {
    return this.scenesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one scene by id' })
  findOne(@Param('id') id: string): Promise<Scene> {
    return this.scenesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a scene (e.g. save its graph)' })
  update(@Param('id') id: string, @Body() dto: UpdateSceneDto): Promise<Scene> {
    return this.scenesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a scene' })
  remove(@Param('id') id: string): Promise<void> {
    return this.scenesService.remove(id);
  }
}
