import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, AuthUser, CurrentUser, Public, ResponseMessage } from '@app/common';
import { FileContentQueryDto, FileDto, UPLOAD_SCHEMA, UploadFileDto } from './dto/file.dto';
import { FilesService, UploadedFileInput } from './files.service';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post()
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ResponseMessage('File uploaded')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: UPLOAD_SCHEMA })
  @ApiOperation({
    summary: 'Upload one file (multipart field "file")',
    description:
      'Images are rotated from EXIF, resized to at most 1600px and get a 320px thumbnail. Max size comes from FILE_MAX_MB (default 10 MB).',
  })
  @ApiEnvelope(FileDto, { status: HttpStatus.CREATED, message: 'File uploaded' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.PAYLOAD_TOO_LARGE)
  upload(
    @UploadedFile() file: UploadedFileInput | undefined,
    @Body() dto: UploadFileDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.files.upload(file, dto.purpose, user);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'File details with fresh signed links' })
  @ApiEnvelope(FileDto)
  @ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.NOT_FOUND)
  get(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.files.get(id, user);
  }

  @Public()
  @Get(':id/content')
  @ApiProduces('image/*', 'application/pdf', 'application/octet-stream')
  @ApiOperation({ summary: 'Download through a signed link. No token needed; the link expires.' })
  @ApiErrors(HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  content(@Param('id', ParseIntPipe) id: number, @Query() query: FileContentQueryDto) {
    return this.files.content(id, query);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ResponseMessage('File deleted')
  @ApiOperation({ summary: 'Delete a file you uploaded (admins can delete any)' })
  @ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.files.remove(id, user);
  }
}
