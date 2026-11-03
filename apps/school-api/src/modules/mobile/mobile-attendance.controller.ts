import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, AuthUser, CurrentUser, RequireRoles, ResponseMessage } from '@app/common';
import { appConfig, AppConfig } from '../../config/configuration';
import { todayIn } from '../../shared/dates';
import { ROLES } from '../access/access.catalog';
import { AttendanceService } from '../attendance/attendance.service';
import {
  LeaveDecisionDto,
  MarkAttendanceDto,
  MonthlyAttendanceDto,
  MonthQueryDto,
  RosterDto,
  RosterQueryDto,
  StudentLeaveDto,
  StudentLeaveInputDto,
  StudentLeaveQueryDto,
} from '../attendance/dto/attendance.dto';
import { StudentLeaveService } from '../attendance/student-leave.service';
import { AssignmentsService } from '../staff/assignments.service';
import { CheckInStatusDto, LocationDto, StaffMonthDto } from '../staff-attendance/dto/staff-attendance.dto';
import { StaffAttendanceService } from '../staff-attendance/staff-attendance.service';
import {
  LeaveBalanceDto,
  StaffLeaveDecisionDto,
  StaffLeaveDto,
  StaffLeaveInputDto,
} from '../staff-leave/dto/staff-leave.dto';
import { StaffLeaveService } from '../staff-leave/staff-leave.service';
import { MySubstitutionDto } from '../substitutes/dto/substitute.dto';
import { SubstitutesService } from '../substitutes/substitutes.service';
import { TeacherTimetableDto } from '../timetable/dto/timetable.dto';
import { ParentTransportDto } from '../transport/dto/transport.dto';
import { RoutesService } from '../transport/routes.service';
import { TimetableService } from '../timetable/timetable.service';
import { TodayAttendanceDto } from './dto/mobile.dto';
import { MobileAccessService } from './mobile-access.service';

@ApiTags('Mobile · Parent')
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
@RequireRoles(ROLES.PARENT)
@Controller('mobile/parent/children/:id')
export class MobileParentAttendanceController {
  constructor(
    private readonly access: MobileAccessService,
    private readonly attendance: AttendanceService,
    private readonly leaves: StudentLeaveService,
    private readonly transport: RoutesService,
    @Inject(appConfig.KEY) private readonly app: AppConfig,
  ) {}

  @Get('transport')
  @ApiOperation({
    summary: 'Bus route, stop with pickup and drop time, bus, driver and attendant; null when the child walks',
  })
  @ApiEnvelope(ParentTransportDto)
  async transportCard(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.transport.forParent(await this.access.childSchool(user.id, id), id);
  }

  @Get('attendance')
  @ApiOperation({ summary: 'Attendance calendar for a month: status of each day and the attendance %' })
  @ApiEnvelope(MonthlyAttendanceDto)
  async month(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Query() query: MonthQueryDto) {
    return this.attendance.monthly(await this.access.childSchool(user.id, id), id, query.month);
  }

  @Get('attendance/today')
  @ApiOperation({ summary: 'Today’s attendance for the home screen badge' })
  @ApiEnvelope(TodayAttendanceDto)
  async today(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number): Promise<TodayAttendanceDto> {
    const schoolId = await this.access.childSchool(user.id, id);
    return { date: todayIn(this.app.timeZone), status: await this.attendance.todayStatus(id, schoolId) };
  }

  @Get('leaves')
  @ApiOperation({ summary: 'Leave requests sent for this child, newest first' })
  @ApiEnvelope(StudentLeaveDto, { isArray: true })
  async leaveList(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.leaves.forStudent(await this.access.childSchool(user.id, id), id);
  }

  @Post('leaves')
  @ResponseMessage('Leave request sent')
  @ApiOperation({
    summary: 'Ask for leave. The class teacher approves it in the Staff app.',
    description: 'Up to 7 days back and 30 days long. 409 LEAVE_OVERLAP when another request covers these days.',
  })
  @ApiEnvelope(StudentLeaveDto, { status: HttpStatus.CREATED, message: 'Leave request sent' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  async apply(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: StudentLeaveInputDto) {
    return this.leaves.apply(await this.access.childSchool(user.id, id), id, dto, user);
  }

  @Post('leaves/:leaveId/cancel')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Leave request cancelled')
  @ApiOperation({ summary: 'Cancel a request that is still waiting' })
  @ApiEnvelope(StudentLeaveDto, { message: 'Leave request cancelled' })
  @ApiErrors(HttpStatus.CONFLICT)
  async cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('leaveId', ParseIntPipe) leaveId: number,
  ) {
    return this.leaves.cancel(await this.access.childSchool(user.id, id), id, leaveId);
  }
}

@ApiTags('Mobile · Teacher')
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
@RequireRoles(ROLES.TEACHER, ROLES.HOD, ROLES.PRINCIPAL)
@Controller('mobile/teacher')
export class MobileTeacherAttendanceController {
  constructor(
    private readonly access: MobileAccessService,
    private readonly assignments: AssignmentsService,
    private readonly attendance: AttendanceService,
    private readonly studentLeaves: StudentLeaveService,
    private readonly staffAttendance: StaffAttendanceService,
    private readonly staffLeaves: StaffLeaveService,
    private readonly timetable: TimetableService,
    private readonly substitutes: SubstitutesService,
  ) {}

  @Get('check-in')
  @ApiOperation({ summary: 'My check-in today: time in, time out, late or not, and how far from school' })
  @ApiEnvelope(CheckInStatusDto)
  checkInStatus(@CurrentUser() user: AuthUser) {
    return this.staffAttendance.status(user);
  }

  @Post('check-in')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Checked in')
  @ApiOperation({
    summary: 'Check in with the phone location',
    description: '400 OUTSIDE_SCHOOL when the phone is outside the school radius; 409 ALREADY_CHECKED_IN.',
  })
  @ApiEnvelope(CheckInStatusDto, { message: 'Checked in' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  checkIn(@CurrentUser() user: AuthUser, @Body() dto: LocationDto) {
    return this.staffAttendance.checkIn(user, dto);
  }

  @Post('check-out')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Checked out')
  @ApiOperation({ summary: 'Check out with the phone location' })
  @ApiEnvelope(CheckInStatusDto, { message: 'Checked out' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  checkOut(@CurrentUser() user: AuthUser, @Body() dto: LocationDto) {
    return this.staffAttendance.checkOut(user, dto);
  }

  @Get('my-attendance')
  @ApiOperation({ summary: 'My attendance for a month' })
  @ApiEnvelope(StaffMonthDto)
  myAttendance(@CurrentUser() user: AuthUser, @Query() query: MonthQueryDto) {
    return this.staffAttendance.month(this.access.teacherSchool(user), user.id, query.month);
  }

  @Get('sections/:id/attendance')
  @ApiOperation({ summary: 'Attendance roster of my section for a date (period 0 is the morning attendance)' })
  @ApiEnvelope(RosterDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  async roster(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Query() query: RosterQueryDto) {
    const schoolId = this.access.teacherSchool(user);
    await this.assignments.assertTeachesSection(schoolId, user.id, id);
    return this.attendance.roster(schoolId, id, query.date, query.period ?? 0);
  }

  @Put('sections/:id/attendance')
  @ResponseMessage('Attendance saved')
  @ApiOperation({ summary: 'Save attendance of my section. Parents of absent students get an alert.' })
  @ApiEnvelope(RosterDto, { message: 'Attendance saved' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async mark(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: MarkAttendanceDto) {
    const schoolId = this.access.teacherSchool(user);
    await this.assignments.assertTeachesSection(schoolId, user.id, id);
    return this.attendance.mark(schoolId, id, dto, user);
  }

  @Get('timetable')
  @ApiOperation({ summary: 'My weekly timetable' })
  @ApiEnvelope(TeacherTimetableDto)
  myTimetable(@CurrentUser() user: AuthUser) {
    return this.timetable.teacherGrid(this.access.teacherSchool(user), user.id);
  }

  @Get('substitutions')
  @ApiOperation({ summary: 'Classes I take in place of absent teachers, today and the next 7 days' })
  @ApiEnvelope(MySubstitutionDto, { isArray: true })
  mySubstitutions(@CurrentUser() user: AuthUser) {
    return this.substitutes.mine(user);
  }

  @Get('leave-balances')
  @ApiOperation({ summary: 'My leave balance per leave type this year' })
  @ApiEnvelope(LeaveBalanceDto, { isArray: true })
  balances(@CurrentUser() user: AuthUser) {
    return this.staffLeaves.balances(this.access.teacherSchool(user), user.id);
  }

  @Get('leaves')
  @ApiOperation({ summary: 'My leave requests, newest first' })
  @ApiEnvelope(StaffLeaveDto, { isArray: true })
  myLeaves(@CurrentUser() user: AuthUser) {
    return this.staffLeaves.mine(user);
  }

  @Post('leaves')
  @ResponseMessage('Leave request sent')
  @ApiOperation({
    summary: 'Apply for leave. It goes to the HOD of my department first, then the principal.',
    description: '400 LEAVE_BALANCE_LOW or NO_WORKING_DAYS; 409 LEAVE_OVERLAP.',
  })
  @ApiEnvelope(StaffLeaveDto, { status: HttpStatus.CREATED, message: 'Leave request sent' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  apply(@CurrentUser() user: AuthUser, @Body() dto: StaffLeaveInputDto) {
    return this.staffLeaves.apply(user, dto);
  }

  @Post('leaves/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Leave request cancelled')
  @ApiOperation({ summary: 'Cancel my request while it is still waiting' })
  @ApiEnvelope(StaffLeaveDto, { message: 'Leave request cancelled' })
  @ApiErrors(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.staffLeaves.cancel(user, id);
  }

  @Get('leave-approvals')
  @ApiOperation({ summary: 'Staff leave requests waiting for me (HOD or principal)' })
  @ApiEnvelope(StaffLeaveDto, { isArray: true })
  approvals(@CurrentUser() user: AuthUser) {
    return this.staffLeaves.approvals(user);
  }

  @Post('leave-approvals/:id/decision')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Decision saved')
  @ApiOperation({ summary: 'Approve or reject a staff leave request waiting for me' })
  @ApiEnvelope(StaffLeaveDto, { message: 'Decision saved' })
  @ApiErrors(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  decideStaff(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StaffLeaveDecisionDto,
  ) {
    return this.staffLeaves.decide(user, id, dto);
  }

  @Get('student-leaves')
  @ApiOperation({ summary: 'Leave requests from parents of my class-teacher sections' })
  @ApiEnvelope(StudentLeaveDto, { paginated: true })
  async parentRequests(@CurrentUser() user: AuthUser, @Query() query: StudentLeaveQueryDto) {
    const schoolId = this.access.teacherSchool(user);
    return this.studentLeaves.list(schoolId, query, await this.access.classTeacherSections(schoolId, user.id));
  }

  @Post('student-leaves/:id/decision')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Decision saved')
  @ApiOperation({ summary: 'Approve or reject a parent’s leave request (class teacher only). The parent is told.' })
  @ApiEnvelope(StudentLeaveDto, { message: 'Decision saved' })
  @ApiErrors(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  async decideStudent(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LeaveDecisionDto,
  ) {
    const schoolId = this.access.teacherSchool(user);
    return this.studentLeaves.decide(
      schoolId,
      id,
      dto,
      user,
      await this.access.classTeacherSections(schoolId, user.id),
    );
  }
}
