import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, AuthUser, CurrentUser, RequirePermissions, ResponseMessage } from '@app/common';
import { ApiSchoolHeader, SchoolId } from '../../shared/school-context';
import { PERMISSIONS } from '../access/access.catalog';
import {
  AssignSubstituteDto,
  AutoAssignResultDto,
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
  @ApiOperation({ summary: 'Remove a substitute from a period' })
  @ApiEnvelope(SubstituteBoardDto, { message: 'Substitute removed' })
  @ApiErrors(HttpStatus.NOT_FOUND)
  cancel(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number) {
    return this.substitutes.cancel(schoolId, id);
  }
}
