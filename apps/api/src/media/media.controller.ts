import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { UploadMediaDto } from './dto/upload-media.dto';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @ApiOperation({
    summary: 'Upload a media file (relays through the backend to R2)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        kind: { type: 'string', enum: ['uploaded', 'generated'] },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMediaDto,
  ) {
    const asset = await this.mediaService.upload(file, dto.kind);
    return { ...asset, url: this.mediaService.publicUrl(asset) };
  }

  @Get()
  @ApiOperation({ summary: 'List all media assets' })
  async findAll() {
    const assets = await this.mediaService.findAll();
    return assets.map((asset) => ({
      ...asset,
      url: this.mediaService.publicUrl(asset),
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one media asset by id' })
  async findOne(@Param('id') id: string) {
    const asset = await this.mediaService.findOne(id);
    return { ...asset, url: this.mediaService.publicUrl(asset) };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a media asset (removes it from R2 too)' })
  remove(@Param('id') id: string): Promise<void> {
    return this.mediaService.remove(id);
  }
}
