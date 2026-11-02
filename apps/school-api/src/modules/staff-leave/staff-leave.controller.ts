import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, AuthUser, CurrentUser, RequirePermissions, ResponseMessage } from '@app/common';
import { ApiSchoolHeader, SchoolId } from '../../shared/school-context';
import { PERMISSIONS } from '../access/access.catalog';
import {
  LeaveBalanceDto,
  LeaveTypeDto,
  LeaveTypeInputDto,
  StaffLeaveDecisionDto,
  StaffLeaveDto,
  StaffLeaveQueryDto,
  UpdateLeaveTypeDto,
} from './dto/staff-leave.dto';
import { StaffLeaveService } from './staff-leave.service';

@ApiTags('Admin · Staff leave')
@ApiBearerAuth()
@ApiSchoolHeader()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
@Controller('admin')
export class StaffLeaveController {
  constructor(private readonly leave: StaffLeaveService) {}

  @Get('leave-types')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_VIEW)
  @ApiOperation({ summary: 'Leave types with yearly days. CL 12, SL 10, EL 15 and LOP are created the first time.' })
  @ApiEnvelope(LeaveTypeDto, { isArray: true })
  types(@SchoolId() schoolId: number) {
    return this.leave.listTypes(schoolId);
  }

  @Post('leave-types')
  @RequirePermissions(PERMISSIONS.SCHOOLS_MANAGE)
  @ResponseMessage('Leave type added')
  @ApiOperation({ summary: 'Add a leave type' })
  @ApiEnvelope(LeaveTypeDto, { status: HttpStatus.CREATED, message: 'Leave type added' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  createType(@SchoolId() schoolId: number, @Body() dto: LeaveTypeInputDto) {
    return this.leave.createType(schoolId, dto);
  }

  @Patch('leave-types/:id')
  @RequirePermissions(PERMISSIONS.SCHOOLS_MANAGE)
  @ResponseMessage('Leave type updated')
  @ApiOperation({ summary: 'Change days per year, paid or active' })
  @ApiEnvelope(LeaveTypeDto, { message: 'Leave type updated' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  updateType(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLeaveTypeDto) {
    return this.leave.updateType(schoolId, id, dto);
  }

  @Get('staff-leaves')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_VIEW)
  @ApiOperation({
    summary: 'Staff leave requests',
    description: 'status pending_hod → pending_principal → approved. search matches staff name and reason.',
  })
  @ApiEnvelope(StaffLeaveDto, { paginated: true })
  list(@SchoolId() schoolId: number, @Query() query: StaffLeaveQueryDto) {
    return this.leave.list(schoolId, query);
  }

  @Get('staff-leaves/balances/:userId')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_VIEW)
  @ApiOperation({ summary: 'Leave balance of one staff member this academic year' })
  @ApiEnvelope(LeaveBalanceDto, { isArray: true })
  balances(@SchoolId() schoolId: number, @Param('userId', ParseIntPipe) userId: number) {
    return this.leave.balances(schoolId, userId);
  }

  @Post('staff-leaves/:id/decision')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.LEAVE_APPROVE)
  @ResponseMessage('Decision saved')
  @ApiOperation({ summary: 'Final approval or rejection (principal). A reason is needed to reject.' })
  @ApiEnvelope(StaffLeaveDto, { message: 'Decision saved' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  decide(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StaffLeaveDecisionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.leave.decide(actor, id, dto, schoolId);
  }
}
