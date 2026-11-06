import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiEnvelope,
  ApiErrors,
  AuthUser,
  CurrentUser,
  RequirePermissions,
  RequireRoles,
  ResponseMessage,
} from '@app/common';
import { ApiPdf, pdfFile } from '../../shared/pdf-response';
import { ApiSchoolHeader, SchoolId } from '../../shared/school-context';
import { PERMISSIONS, ROLES } from '../access/access.catalog';
import {
  MyPayslipQueryDto,
  PayrollRunDetailDto,
  PayrollRunDto,
  PayslipDto,
  PayslipPeriodsDto,
  PayslipPreviewDto,
  RunMonthDto,
  RunQueryDto,
  SalaryQueryDto,
  SalaryStaffDto,
  SalaryStructureInputDto,
} from './dto/payroll.dto';
import { PayrollService } from './payroll.service';
import { TEACHER_MODULE_TAGS } from '../mobile/teacher-modules.catalog';

@ApiTags('Admin · Payroll')
@ApiBearerAuth()
@ApiSchoolHeader()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
@Controller('admin/payroll')
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  @Get('salaries')
  @RequirePermissions(PERMISSIONS.PAYROLL_VIEW)
  @ApiOperation({
    summary: 'Staff with their salary structure',
    description:
      'search matches name, employee number, designation and department. sort: name, employee_no, created_at.',
  })
  @ApiEnvelope(SalaryStaffDto, { paginated: true })
  salaries(@SchoolId() schoolId: number, @Query() query: SalaryQueryDto) {
    return this.payroll.listSalaries(schoolId, query);
  }

  @Get('salaries/:userId')
  @RequirePermissions(PERMISSIONS.PAYROLL_VIEW)
  @ApiOperation({ summary: 'One staff member’s salary structure' })
  @ApiEnvelope(SalaryStaffDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  salary(@SchoolId() schoolId: number, @Param('userId', ParseIntPipe) userId: number) {
    return this.payroll.getSalary(schoolId, userId);
  }

  @Put('salaries/:userId')
  @RequirePermissions(PERMISSIONS.PAYROLL_MANAGE)
  @ResponseMessage('Salary saved')
  @ApiOperation({ summary: 'Set the monthly salary: earnings, PF/ESI switches and fixed deductions' })
  @ApiEnvelope(SalaryStaffDto, { message: 'Salary saved' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  setSalary(
    @SchoolId() schoolId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: SalaryStructureInputDto,
  ) {
    return this.payroll.setSalary(schoolId, userId, dto);
  }

  @Get('runs')
  @RequirePermissions(PERMISSIONS.PAYROLL_VIEW)
  @ApiOperation({ summary: 'Payroll runs, newest month first. sort: month, created_at.' })
  @ApiEnvelope(PayrollRunDto, { paginated: true })
  runs(@SchoolId() schoolId: number, @Query() query: RunQueryDto) {
    return this.payroll.listRuns(schoolId, query);
  }

  @Post('runs')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.PAYROLL_MANAGE)
  @ResponseMessage('Payroll calculated')
  @ApiOperation({
    summary: 'Run (or re-run) payroll for a month as a draft',
    description:
      'Working days skip Sundays and holidays. Loss of pay comes from approved unpaid leave, days marked absent without leave, and days before joining. 409 RUN_FINALIZED once final.',
  })
  @ApiEnvelope(PayrollRunDetailDto, { message: 'Payroll calculated' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  run(@SchoolId() schoolId: number, @Body() dto: RunMonthDto, @CurrentUser() actor: AuthUser) {
    return this.payroll.run(schoolId, dto.month, actor);
  }

  @Get('runs/:id')
  @RequirePermissions(PERMISSIONS.PAYROLL_VIEW)
  @ApiOperation({ summary: 'A payroll run with every payslip and the staff left out for want of a salary' })
  @ApiEnvelope(PayrollRunDetailDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  detail(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number) {
    return this.payroll.detail(schoolId, id);
  }

  @Post('runs/:id/finalize')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.PAYROLL_MANAGE)
  @ResponseMessage('Payroll finalised')
  @ApiOperation({ summary: 'Lock the run. Staff are told their payslip is ready and can download it in the app.' })
  @ApiEnvelope(PayrollRunDetailDto, { message: 'Payroll finalised' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  finalize(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthUser) {
    return this.payroll.finalize(schoolId, id, actor);
  }

  @Delete('runs/:id')
  @RequirePermissions(PERMISSIONS.PAYROLL_MANAGE)
  @ResponseMessage('Draft payroll deleted')
  @ApiOperation({ summary: 'Delete a draft run' })
  @ApiErrors(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  async remove(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number) {
    await this.payroll.remove(schoolId, id);
    return null;
  }

  @Get('payslips/:id/pdf')
  @RequirePermissions(PERMISSIONS.PAYROLL_VIEW)
  @ApiOperation({ summary: 'Payslip PDF (marked draft until the run is final)' })
  @ApiPdf('Payslip PDF')
  @ApiErrors(HttpStatus.NOT_FOUND)
  async payslipPdf(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number) {
    return pdfFile(await this.payroll.pdf(schoolId, id));
  }
}

@ApiTags('Me')
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED)
@Controller('me/payslips')
export class MyPayslipsController {
  constructor(private readonly payroll: PayrollService) {}

  @Get()
  @ApiOperation({
    summary: 'My payslips (final months only), newest first, with year and month filters',
    description:
      'year=2026 shows that year; month=9 with year shows one month; month alone shows that month in every year.',
  })
  @ApiEnvelope(PayslipDto, { paginated: true })
  @ApiErrors(HttpStatus.BAD_REQUEST)
  list(@CurrentUser() user: AuthUser, @Query() query: MyPayslipQueryDto) {
    return this.payroll.mine(user, query.page, query.limit, { year: query.year, month: query.month });
  }

  @Get('periods')
  @ApiOperation({
    summary: 'Years and months that have a payslip, for the year and month filters',
    description: 'Newest first, with the net pay of each month and the total per year.',
  })
  @ApiEnvelope(PayslipPeriodsDto)
  periods(@CurrentUser() user: AuthUser) {
    return this.payroll.myPeriods(user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Payslip preview: earnings and deductions lines, days worked, gross and net pay',
    description:
      'Only my own final payslips; others return 404 PAYSLIP_NOT_FOUND. pdf_path downloads the same payslip as a PDF.',
  })
  @ApiEnvelope(PayslipPreviewDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  preview(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.payroll.myPayslip(user, id, '/api/v1/me/payslips');
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download my payslip PDF' })
  @ApiPdf('Payslip PDF')
  @ApiErrors(HttpStatus.NOT_FOUND)
  async pdf(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return pdfFile(await this.payroll.pdf(null, id, user.id), true);
  }
}

@ApiTags(TEACHER_MODULE_TAGS.MODULE_8)
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
@RequireRoles(ROLES.TEACHER, ROLES.HOD, ROLES.PRINCIPAL)
@Controller('mobile/teacher/payslips')
export class MobileTeacherPayslipsController {
  constructor(private readonly payroll: PayrollService) {}

  @Get()
  @ApiOperation({
    summary: 'My payslips (final months only), newest first, with year and month filters',
    description:
      'year=2026 shows that year; month=9 with year shows one month; month alone shows that month in every year.',
  })
  @ApiEnvelope(PayslipDto, { paginated: true })
  @ApiErrors(HttpStatus.BAD_REQUEST)
  list(@CurrentUser() user: AuthUser, @Query() query: MyPayslipQueryDto) {
    return this.payroll.mine(user, query.page, query.limit, { year: query.year, month: query.month });
  }

  @Get('periods')
  @ApiOperation({
    summary: 'Years and months that have a payslip, for the year and month filters',
    description: 'Newest first, with the net pay of each month and the total per year.',
  })
  @ApiEnvelope(PayslipPeriodsDto)
  periods(@CurrentUser() user: AuthUser) {
    return this.payroll.myPeriods(user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Payslip preview: earnings and deductions lines, days worked, gross and net pay',
    description:
      'Only my own final payslips; others return 404 PAYSLIP_NOT_FOUND. pdf_path downloads the same payslip as a PDF.',
  })
  @ApiEnvelope(PayslipPreviewDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  preview(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.payroll.myPayslip(user, id, '/api/v1/mobile/teacher/payslips');
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download my payslip PDF' })
  @ApiPdf('Payslip PDF')
  @ApiErrors(HttpStatus.NOT_FOUND)
  async pdf(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return pdfFile(await this.payroll.pdf(null, id, user.id), true);
  }
}
