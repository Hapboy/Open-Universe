import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PresetsService } from './presets.service';
import { CreatePresetDto } from './dto/create-preset.dto';
import { UpdatePresetDto } from './dto/update-preset.dto';
import { Preset } from './preset.entity';

@ApiTags('presets')
@Controller('presets')
export class PresetsController {
  constructor(private readonly presetsService: PresetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a preset' })
  create(@Body() dto: CreatePresetDto): Promise<Preset> {
    return this.presetsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List presets, optionally filtered by entity type' })
  @ApiQuery({ name: 'entityType', required: false, example: 'character' })
  findAll(@Query('entityType') entityType?: string): Promise<Preset[]> {
    return this.presetsService.findAll(entityType);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one preset by id' })
  findOne(@Param('id') id: string): Promise<Preset> {
    return this.presetsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a preset (e.g. its snapshot)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePresetDto,
  ): Promise<Preset> {
    return this.presetsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a preset' })
  remove(@Param('id') id: string): Promise<void> {
    return this.presetsService.remove(id);
  }
}
