import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, AuthUser, CurrentUser, RequirePermissions, ResponseMessage } from '@app/common';
import { ApiSchoolHeader, SchoolId } from '../../shared/school-context';
import { PERMISSIONS } from '../access/access.catalog';
import {
  AssignSubstituteDto,
  AutoAssignResultDto,
  CombineClassDto,
  CombineOptionsDto,
  FreeTeachersDto,
  FreeTeachersQueryDto,
  SubstituteBoardDto,
  SubstituteDateQueryDto,
} from './dto/substitute.dto';
import { SubstitutesService } from './substitutes.service';

@ApiTags('Admin · Substitutes')
@ApiBearerAuth()
@ApiSchoolHeader()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
@Controller('admin/substitutes')
export class SubstitutesController {
  constructor(private readonly substitutes: SubstitutesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.TIMETABLE_VIEW)
  @ApiOperation({
    summary: 'Teachers away on a date (approved leave or marked absent) with each period they miss and its cover',
  })
  @ApiEnvelope(SubstituteBoardDto)
  board(@SchoolId() schoolId: number, @Query() query: SubstituteDateQueryDto) {
    return this.substitutes.board(schoolId, query.date);
  }

  @Get('free')
  @RequirePermissions(PERMISSIONS.TIMETABLE_VIEW)
  @ApiOperation({
    summary: 'Teachers free in that period, best match first',
    description:
      'Excludes teachers who are away, teaching, or already covering that period. Same subject first, then teachers who know the section, then the lightest day.',
  })
  @ApiEnvelope(FreeTeachersDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  free(@SchoolId() schoolId: number, @Query() query: FreeTeachersQueryDto) {
    return this.substitutes.free(schoolId, query.date, query.slot_id);
  }

  @Get('combine-options')
  @RequirePermissions(PERMISSIONS.TIMETABLE_VIEW)
  @ApiOperation({
    summary: 'Sections the class can sit with in that period, and its boys and girls count',
    description:
      'Only other sections of the same class that have a period at the same time with a teacher in (its own teacher, or its proxy). Empty targets means no class is running, so assign a proxy instead.',
  })
  @ApiEnvelope(CombineOptionsDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  combineOptions(@SchoolId() schoolId: number, @Query() query: FreeTeachersQueryDto) {
    return this.substitutes.combineOptions(schoolId, query.date, query.slot_id);
  }

  @Post('combine')
  @RequirePermissions(PERMISSIONS.SUBSTITUTES_MANAGE)
  @ResponseMessage('Class combined')
  @ApiOperation({
    summary: 'Combine the class with other sections instead of a proxy teacher',
    description:
      'mode whole: the whole class sits with section_id. mode split: boys go to boys_section_id and girls (and students marked other) to girls_section_id. The teachers of those sections are told in the Staff app. Replaces a proxy already set for the period. 409 SECTION_NOT_AVAILABLE when the section has no class with a teacher in that period; 409 TEACHER_NOT_ABSENT when the period’s teacher is in.',
  })
  @ApiEnvelope(SubstituteBoardDto, { message: 'Class combined' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  @HttpCode(HttpStatus.OK)
  combine(@SchoolId() schoolId: number, @Body() dto: CombineClassDto, @CurrentUser() actor: AuthUser) {
    return this.substitutes.combine(schoolId, dto, actor);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SUBSTITUTES_MANAGE)
  @ResponseMessage('Substitute assigned')
  @ApiOperation({
    summary: 'Assign a substitute to one period. The teacher is told in the Staff app (SMS if the push fails).',
    description:
      '409 TEACHER_NOT_ABSENT when the period’s teacher is in; 409 SUBSTITUTE_BUSY when the chosen teacher is not free.',
  })
  @ApiEnvelope(SubstituteBoardDto, { status: HttpStatus.CREATED, message: 'Substitute assigned' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  assign(@SchoolId() schoolId: number, @Body() dto: AssignSubstituteDto, @CurrentUser() actor: AuthUser) {
    return this.substitutes.assign(schoolId, dto, actor);
  }

  @Post('auto')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.SUBSTITUTES_MANAGE)
  @ResponseMessage('Free teachers assigned')
  @ApiOperation({ summary: 'Fill every uncovered period of the date with the best free teacher and notify them' })
  @ApiEnvelope(AutoAssignResultDto, { message: 'Free teachers assigned' })
  @ApiErrors(HttpStatus.BAD_REQUEST)
  auto(@SchoolId() schoolId: number, @Body() dto: SubstituteDateQueryDto, @CurrentUser() actor: AuthUser) {
    return this.substitutes.autoAssign(schoolId, dto.date, actor);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.SUBSTITUTES_MANAGE)
  @ResponseMessage('Substitute removed')
  @ApiOperation({ summary: 'Remove the proxy or the combined class from a period' })
  @ApiEnvelope(SubstituteBoardDto, { message: 'Substitute removed' })
  @ApiErrors(HttpStatus.NOT_FOUND)
  cancel(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number) {
    return this.substitutes.cancel(schoolId, id);
  }
}
