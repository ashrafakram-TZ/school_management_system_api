import { Body, Controller, Get, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, AuthUser, CurrentUser, RequirePermissions, ResponseMessage } from '@app/common';
import { ApiSchoolHeader, SchoolId } from '../../shared/school-context';
import { PERMISSIONS } from '../access/access.catalog';
import { CreateSchoolDto, SchoolDto, SchoolQueryDto, UpdateCurrentSchoolDto, UpdateSchoolDto } from './dto/school.dto';
import { SchoolsService } from './schools.service';

@ApiTags('Platform · Schools')
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
@RequirePermissions(PERMISSIONS.PLATFORM_SCHOOLS)
@Controller('admin/schools')
export class PlatformSchoolsController {
  constructor(private readonly schools: SchoolsService) {}

  @Get()
  @ApiOperation({
    summary: 'List every school on the platform',
    description: 'search matches name, code and city. sort: name, code, created_at.',
  })
  @ApiEnvelope(SchoolDto, { paginated: true })
  list(@Query() query: SchoolQueryDto) {
    return this.schools.list(query);
  }

  @Post()
  @ResponseMessage('School created')
  @ApiOperation({ summary: 'Create a school, optionally with its first admin (who receives an invite)' })
  @ApiEnvelope(SchoolDto, { status: HttpStatus.CREATED, message: 'School created' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  create(@Body() dto: CreateSchoolDto, @CurrentUser() actor: AuthUser) {
    return this.schools.create(dto, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one school' })
  @ApiEnvelope(SchoolDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  get(@Param('id', ParseIntPipe) id: number) {
    return this.schools.get(id);
  }

  @Patch(':id')
  @ResponseMessage('School updated')
  @ApiOperation({ summary: 'Update a school or switch it off' })
  @ApiEnvelope(SchoolDto, { message: 'School updated' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSchoolDto) {
    return this.schools.update(id, dto);
  }
}

@ApiTags('Admin · School setup')
@ApiBearerAuth()
@ApiSchoolHeader()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
@Controller('admin/school')
export class CurrentSchoolController {
  constructor(private readonly schools: SchoolsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SCHOOLS_VIEW)
  @ApiOperation({ summary: 'The school profile the signed-in admin works on' })
  @ApiEnvelope(SchoolDto)
  get(@SchoolId() schoolId: number) {
    return this.schools.get(schoolId);
  }

  @Patch()
  @RequirePermissions(PERMISSIONS.SCHOOLS_MANAGE)
  @ResponseMessage('School profile updated')
  @ApiOperation({ summary: 'Update the school profile' })
  @ApiEnvelope(SchoolDto, { message: 'School profile updated' })
  @ApiErrors(HttpStatus.BAD_REQUEST)
  update(@SchoolId() schoolId: number, @Body() dto: UpdateCurrentSchoolDto) {
    return this.schools.updateCurrent(schoolId, dto);
  }
}
