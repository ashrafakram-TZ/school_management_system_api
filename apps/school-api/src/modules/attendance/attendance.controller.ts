import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, AuthUser, CurrentUser, RequirePermissions, ResponseMessage } from '@app/common';
import { ApiSchoolHeader, SchoolId } from '../../shared/school-context';
import { PERMISSIONS } from '../access/access.catalog';
import { AttendanceService } from './attendance.service';
import {
  AttendanceBoardDto,
  BoardQueryDto,
  LeaveDecisionDto,
  MarkAttendanceDto,
  MonthlyAttendanceDto,
  MonthQueryDto,
  RosterDto,
  RosterQueryDto,
  SectionReportDto,
  StudentLeaveDto,
  StudentLeaveQueryDto,
} from './dto/attendance.dto';
import { StudentLeaveService } from './student-leave.service';

@ApiTags('Admin · Attendance')
@ApiBearerAuth()
@ApiSchoolHeader()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
@Controller('admin/attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get('board')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_VIEW)
  @ApiOperation({ summary: 'Daily attendance of every section for one date, with totals and what is not marked yet' })
  @ApiEnvelope(AttendanceBoardDto)
  board(@SchoolId() schoolId: number, @Query() query: BoardQueryDto) {
    return this.attendance.board(schoolId, query.date);
  }

  @Get('sections/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_VIEW)
  @ApiOperation({
    summary: 'Section roster for a date and period, with saved marks or defaults',
    description: 'Students on approved leave default to leave; everyone else defaults to present.',
  })
  @ApiEnvelope(RosterDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  roster(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number, @Query() query: RosterQueryDto) {
    return this.attendance.roster(schoolId, id, query.date, query.period ?? 0);
  }

  @Put('sections/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_MANAGE)
  @ResponseMessage('Attendance saved')
  @ApiOperation({
    summary:
      'Save attendance for a section. Parents of absent students get an alert (daily attendance, today only, once).',
  })
  @ApiEnvelope(RosterDto, { message: 'Attendance saved' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  mark(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MarkAttendanceDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.attendance.mark(schoolId, id, dto, actor);
  }

  @Get('sections/:id/report')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_VIEW)
  @ApiOperation({ summary: 'Monthly attendance % of every student in a section' })
  @ApiEnvelope(SectionReportDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  report(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number, @Query() query: MonthQueryDto) {
    return this.attendance.sectionReport(schoolId, id, query.month);
  }

  @Get('students/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_VIEW)
  @ApiOperation({ summary: 'One student’s month: status of each day and the attendance %' })
  @ApiEnvelope(MonthlyAttendanceDto)
  monthly(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number, @Query() query: MonthQueryDto) {
    return this.attendance.monthly(schoolId, id, query.month);
  }
}

@ApiTags('Admin · Attendance')
@ApiBearerAuth()
@ApiSchoolHeader()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
@Controller('admin/student-leaves')
export class StudentLeavesController {
  constructor(private readonly leaves: StudentLeaveService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ATTENDANCE_VIEW)
  @ApiOperation({
    summary: 'Leave requests sent by parents',
    description: 'search matches student name, admission number and reason. sort: from_date, created_at, status.',
  })
  @ApiEnvelope(StudentLeaveDto, { paginated: true })
  list(@SchoolId() schoolId: number, @Query() query: StudentLeaveQueryDto) {
    return this.leaves.list(schoolId, query);
  }

  @Post(':id/decision')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.ATTENDANCE_MANAGE)
  @ResponseMessage('Decision saved')
  @ApiOperation({ summary: 'Approve or reject a waiting request. The parent is told in the app.' })
  @ApiEnvelope(StudentLeaveDto, { message: 'Decision saved' })
  @ApiErrors(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  decide(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LeaveDecisionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.leaves.decide(schoolId, id, dto, actor);
  }
}
