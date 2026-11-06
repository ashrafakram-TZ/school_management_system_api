import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, AuthUser, CurrentUser, RequirePermissions, ResponseMessage } from '@app/common';
import { ApiSchoolHeader, SchoolId } from '../../shared/school-context';
import { VerifyDocumentDto } from '../../shared/verification';
import { PERMISSIONS } from '../access/access.catalog';
import { AssignmentsService } from './assignments.service';
import {
  AssignmentsQueryDto,
  BankDetailsInputDto,
  CreateStaffDto,
  QualificationsDto,
  SaveAssignmentsDto,
  SaveStaffBanksDto,
  StaffDocumentInputDto,
  StaffQueryDto,
  UpdateStaffDto,
} from './dto/staff-input.dto';
import {
  AssignmentMatrixDto,
  BankDetailsDto,
  StaffDetailDto,
  StaffDocumentDto,
  StaffInsightsDto,
  StaffListItemDto,
} from './dto/staff-response.dto';
import { StaffService } from './staff.service';

@ApiTags('Admin · Staff')
@ApiBearerAuth()
@ApiSchoolHeader()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
@Controller('admin/staff')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.STAFF_VIEW)
  @ApiOperation({
    summary: 'Staff and teachers with load, class teacher sections and what needs attention',
    description:
      'search matches name, mobile, employee number, designation and department. sort: name, employee_no, joining_date, designation, created_at. Resigned staff are hidden unless status=resigned.',
  })
  @ApiEnvelope(StaffListItemDto, { paginated: true })
  list(@SchoolId() schoolId: number, @Query() query: StaffQueryDto) {
    return this.staff.list(schoolId, query);
  }

  @Get('insights')
  @RequirePermissions(PERMISSIONS.STAFF_VIEW)
  @ApiOperation({
    summary: 'Teacher insight cards: total teachers, average load, class teachers, need attention',
    description:
      'Each card maps to a list filter: staff_type=teaching, sort by load, class_teacher=true, needs_attention=true.',
  })
  @ApiEnvelope(StaffInsightsDto)
  insights(@SchoolId() schoolId: number) {
    return this.staff.insights(schoolId);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.STAFF_VIEW)
  @ApiOperation({ summary: 'Staff profile with qualifications, documents, bank summary and this year’s classes' })
  @ApiEnvelope(StaffDetailDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  get(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number) {
    return this.staff.get(schoolId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.STAFF_MANAGE)
  @ResponseMessage('Staff member added')
  @ApiOperation({
    summary: 'Add a staff member with a Staff app login',
    description:
      'A parent of this school with the same mobile keeps their Parent role and gets the staff roles too. The invite SMS goes out unless send_invite is false.',
  })
  @ApiEnvelope(StaffDetailDto, { status: HttpStatus.CREATED, message: 'Staff member added' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  create(@SchoolId() schoolId: number, @Body() dto: CreateStaffDto, @CurrentUser() actor: AuthUser) {
    return this.staff.create(schoolId, dto, actor);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.STAFF_MANAGE)
  @ResponseMessage('Staff member updated')
  @ApiOperation({
    summary: 'Update profile, roles or status',
    description: 'status=resigned switches off the login and signs out every device.',
  })
  @ApiEnvelope(StaffDetailDto, { message: 'Staff member updated' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  update(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.staff.update(schoolId, id, dto, actor);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.STAFF_MANAGE)
  @ResponseMessage('Staff member removed')
  @ApiOperation({ summary: 'Remove a staff member added by mistake. Use status=resigned for people who leave.' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  remove(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthUser) {
    return this.staff.remove(schoolId, id, actor);
  }

  @Put(':id/qualifications')
  @RequirePermissions(PERMISSIONS.STAFF_MANAGE)
  @ResponseMessage('Qualifications saved')
  @ApiOperation({ summary: 'Replace the qualification list' })
  @ApiEnvelope(StaffDetailDto, { message: 'Qualifications saved' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  qualifications(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number, @Body() dto: QualificationsDto) {
    return this.staff.setQualifications(schoolId, id, dto);
  }

  @Post(':id/documents')
  @RequirePermissions(PERMISSIONS.STAFF_MANAGE)
  @ResponseMessage('Document added')
  @ApiOperation({ summary: 'Attach an uploaded file (POST /files). It starts as pending.' })
  @ApiEnvelope(StaffDocumentDto, { status: HttpStatus.CREATED, message: 'Document added' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  addDocument(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number, @Body() dto: StaffDocumentInputDto) {
    return this.staff.addDocument(schoolId, id, dto);
  }

  @Post(':id/documents/:documentId/verify')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.STAFF_MANAGE)
  @ResponseMessage('Verification saved')
  @ApiOperation({ summary: 'Mark a document verified, or rejected with a reason' })
  @ApiEnvelope(StaffDocumentDto, { message: 'Verification saved' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  verifyDocument(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('documentId', ParseIntPipe) documentId: number,
    @Body() dto: VerifyDocumentDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.staff.verifyDocument(schoolId, id, documentId, dto, actor);
  }

  @Delete(':id/documents/:documentId')
  @RequirePermissions(PERMISSIONS.STAFF_MANAGE)
  @ResponseMessage('Document deleted')
  @ApiOperation({ summary: 'Delete a document' })
  @ApiErrors(HttpStatus.NOT_FOUND)
  removeDocument(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('documentId', ParseIntPipe) documentId: number,
  ) {
    return this.staff.removeDocument(schoolId, id, documentId);
  }

  @Get(':id/bank')
  @RequirePermissions(PERMISSIONS.STAFF_BANK)
  @ApiOperation({ summary: 'Full bank accounts and PAN (decrypted). Needs the staff.bank permission.' })
  @ApiEnvelope(BankDetailsDto, { isArray: true })
  @ApiErrors(HttpStatus.NOT_FOUND)
  bank(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number) {
    return this.staff.bank(schoolId, id);
  }

  @Put(':id/bank')
  @RequirePermissions(PERMISSIONS.STAFF_BANK)
  @ResponseMessage('Bank details saved')
  @ApiOperation({ summary: 'Save bank details. Account number and PAN are stored encrypted.' })
  @ApiEnvelope(StaffDetailDto, { message: 'Bank details saved' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  saveBank(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveStaffBanksDto | BankDetailsInputDto[] | BankDetailsInputDto,
  ) {
    return this.staff.saveBank(schoolId, id, dto);
  }

  @Patch(':id/bank/:bankId/primary')
  @RequirePermissions(PERMISSIONS.STAFF_BANK)
  @ResponseMessage('Primary bank account updated')
  @ApiOperation({ summary: 'Set a bank account as primary' })
  @ApiEnvelope(StaffDetailDto, { message: 'Primary bank account updated' })
  @ApiErrors(HttpStatus.NOT_FOUND)
  setPrimary(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('bankId', ParseIntPipe) bankId: number,
  ) {
    return this.staff.setPrimaryBank(schoolId, id, bankId);
  }

  @Delete(':id/bank/:bankId')
  @RequirePermissions(PERMISSIONS.STAFF_BANK)
  @ResponseMessage('Bank account removed')
  @ApiOperation({ summary: 'Remove a bank account' })
  @ApiEnvelope(StaffDetailDto, { message: 'Bank account removed' })
  @ApiErrors(HttpStatus.NOT_FOUND)
  removeBank(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('bankId', ParseIntPipe) bankId: number,
  ) {
    return this.staff.deleteBankAccount(schoolId, id, bankId);
  }
}

@ApiTags('Admin · Staff')
@ApiBearerAuth()
@ApiSchoolHeader()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
@Controller('admin/teacher-assignments')
export class TeacherAssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.STAFF_VIEW)
  @ApiOperation({ summary: 'Assignment matrix: each section’s subjects with their teacher, plus each teacher’s load' })
  @ApiEnvelope(AssignmentMatrixDto)
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  matrix(@SchoolId() schoolId: number, @Query() query: AssignmentsQueryDto) {
    return this.assignments.matrix(schoolId, query);
  }

  @Put()
  @RequirePermissions(PERMISSIONS.STAFF_MANAGE)
  @ResponseMessage('Assignments saved')
  @ApiOperation({
    summary: 'Set or clear teachers for section and subject pairs',
    description: 'teacher_user_id null removes the teacher. Returns the updated matrix.',
  })
  @ApiEnvelope(AssignmentMatrixDto, { message: 'Assignments saved' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  save(@SchoolId() schoolId: number, @Body() dto: SaveAssignmentsDto) {
    return this.assignments.save(schoolId, dto);
  }
}
