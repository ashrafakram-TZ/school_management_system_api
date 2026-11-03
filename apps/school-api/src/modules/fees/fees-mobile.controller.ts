import { Controller, Get, HttpStatus, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, AppException, AuthUser, CurrentUser, RequireRoles } from '@app/common';
import { ApiPdf, pdfFile } from '../../shared/pdf-response';
import { ROLES } from '../access/access.catalog';
import { SectionFeesDto, StudentFeesDto } from './dto/fees.dto';
import { FeesService } from './fees.service';

const teacherSchool = (user: AuthUser): number => {
  if (!user.school_id) throw AppException.forbidden('Your account is not linked to a school', 'NO_SCHOOL');
  return user.school_id;
};

@ApiTags('Mobile · Teacher')
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
@RequireRoles(ROLES.TEACHER, ROLES.HOD, ROLES.PRINCIPAL)
@Controller('mobile/teacher')
export class MobileTeacherFeesController {
  constructor(private readonly fees: FeesService) {}

  @Get('sections/:id/fees')
  @ApiOperation({
    summary: 'Fee status of every student in my section (class teacher only, read-only)',
    description:
      'status is paid, partly_paid, due or overdue. Another teacher’s section returns 403 NOT_CLASS_TEACHER.',
  })
  @ApiEnvelope(SectionFeesDto)
  section(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.fees.sectionFees(teacherSchool(user), id, user.id);
  }

  @Get('students/:id/fees')
  @ApiOperation({ summary: 'Fee summary of a student in my class-teacher section (read-only)' })
  @ApiEnvelope(StudentFeesDto)
  student(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.fees.teacherStudentFees(teacherSchool(user), id, user.id);
  }
}

@ApiTags('Mobile · Parent')
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
@RequireRoles(ROLES.PARENT)
@Controller('mobile/parent/children/:id/fees')
export class MobileParentFeesController {
  constructor(private readonly fees: FeesService) {}

  @Get()
  @ApiOperation({
    summary: 'Fees of my child: status, balance, next due date, invoices with their lines and payments',
  })
  @ApiEnvelope(StudentFeesDto)
  async summary(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.fees.summary(await this.fees.childSchool(user.id, id), id);
  }

  @Get('receipts/:paymentId')
  @ApiOperation({ summary: 'Download a receipt PDF of my child’s payment' })
  @ApiPdf('Fee receipt PDF')
  async receipt(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('paymentId', ParseIntPipe) paymentId: number,
  ) {
    return pdfFile(await this.fees.receipt(await this.fees.childSchool(user.id, id), paymentId, id), true);
  }
}
