import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../users/user.entity';
import { MediaService } from './media.service';
import { UploadMediaDto } from './dto/upload-media.dto';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
    @CurrentUser() user: User,
  ) {
    const asset = await this.mediaService.upload(file, dto.kind, user.id);
    return { ...asset, url: this.mediaService.publicUrl(asset) };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List the authenticated user's media assets" })
  async findAll(@CurrentUser() user: User) {
    const assets = await this.mediaService.findAll(user.id);
    return assets.map((asset) => ({
      ...asset,
      url: this.mediaService.publicUrl(asset),
    }));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one media asset by id' })
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    const asset = await this.mediaService.findOne(id, user.id);
    return { ...asset, url: this.mediaService.publicUrl(asset) };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a media asset (removes it from R2 too)' })
  remove(@Param('id') id: string, @CurrentUser() user: User): Promise<void> {
    return this.mediaService.remove(id, user.id);
  }
}
