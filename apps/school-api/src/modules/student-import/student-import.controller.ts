import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, RequirePermissions } from '@app/common';
import { ApiFile } from '../../shared/pdf-response';
import { ApiSchoolHeader, SchoolId } from '../../shared/school-context';
import { PERMISSIONS } from '../access/access.catalog';
import { UploadedFileInput } from '../files/files.service';
import { IMPORT_UPLOAD_SCHEMA, ImportOptionsDto, ImportReportDto } from './dto/import.dto';
import { StudentImportService } from './student-import.service';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@ApiTags('Admin · Students')
@ApiBearerAuth()
@ApiSchoolHeader()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
@Controller('admin/student-import')
export class StudentImportController {
  constructor(private readonly imports: StudentImportService) {}

  @Get('template')
  @RequirePermissions(PERMISSIONS.STUDENTS_MANAGE)
  @ApiOperation({ summary: 'Excel template with this school’s classes, dropdowns and instructions' })
  @ApiFile(XLSX, 'Student import template')
  async template(@SchoolId() schoolId: number) {
    const file = await this.imports.template(schoolId);
    return new StreamableFile(file.buffer, {
      type: XLSX,
      length: file.buffer.length,
      disposition: `attachment; filename="${file.name}"`,
    });
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.STUDENTS_MANAGE)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: IMPORT_UPLOAD_SCHEMA })
  @ApiOperation({
    summary: 'Check or import students and parents from the Excel template',
    description:
      'mode=validate checks every row and changes nothing. mode=import saves the valid rows, one student per row, and reports each row. Parents with the same mobile are reused, which links siblings.',
  })
  @ApiEnvelope(ImportReportDto)
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.PAYLOAD_TOO_LARGE)
  run(
    @SchoolId() schoolId: number,
    @UploadedFile() file: UploadedFileInput | undefined,
    @Body() options: ImportOptionsDto,
  ) {
    return this.imports.run(schoolId, file, options.mode ?? 'validate', options.send_invites ?? false);
  }
}
