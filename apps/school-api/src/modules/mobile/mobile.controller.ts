import { Body, Controller, Get, HttpStatus, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, AuthUser, CurrentUser, RequireRoles, ResponseMessage } from '@app/common';
import { ROLES } from '../access/access.catalog';
import { AssignmentsService } from '../staff/assignments.service';
import { TeacherClassDto } from '../staff/dto/staff-response.dto';
import { DigitalIdDto } from '../student-lifecycle/dto/lifecycle.dto';
import { StudentLifecycleService } from '../student-lifecycle/student-lifecycle.service';
import { BehaviourInputDto, BehaviourNoteDto, HealthDto, StudentDocumentDto } from '../student-records/dto/records.dto';
import { StudentRecordsService } from '../student-records/student-records.service';
import { StudentDetailDto } from '../students/dto/student-response.dto';
import { StudentsService } from '../students/students.service';
import { ChildCardDto } from './dto/mobile.dto';
import { RosterStudentDto } from './dto/teacher-app.dto';
import { MobileAccessService } from './mobile-access.service';
import { TeacherAppService } from './teacher-app.service';

@ApiTags('Mobile · Parent')
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
@RequireRoles(ROLES.PARENT)
@Controller('mobile/parent/children/:id')
export class MobileParentChildController {
  constructor(
    private readonly access: MobileAccessService,
    private readonly records: StudentRecordsService,
    private readonly lifecycle: StudentLifecycleService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Child card: class, section, class teacher, photo, blood group and tile badges' })
  @ApiEnvelope(ChildCardDto)
  card(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.access.childCard(user.id, id);
  }

  @Get('id-card')
  @ApiOperation({ summary: 'Digital ID card. Draw qr_token as a QR code; the bus attendant scans it.' })
  @ApiEnvelope(DigitalIdDto)
  async idCard(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.lifecycle.digitalId(await this.access.childSchool(user.id, id), id);
  }

  @Get('documents')
  @ApiOperation({ summary: 'Documents the school shares with parents, with their verification status' })
  @ApiEnvelope(StudentDocumentDto, { isArray: true })
  async documents(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.records.listDocuments(await this.access.childSchool(user.id, id), id, { parent: true });
  }

  @Get('health')
  @ApiOperation({ summary: 'Health summary and vaccination log (read-only)' })
  @ApiEnvelope(HealthDto)
  async health(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.records.getHealth(await this.access.childSchool(user.id, id), id);
  }

  @Get('behaviour')
  @ApiOperation({ summary: 'Behaviour notes shared with parents (read-only)' })
  @ApiEnvelope(BehaviourNoteDto, { isArray: true })
  async behaviour(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.records.listBehaviour(await this.access.childSchool(user.id, id), id, { parent: true });
  }
}

@ApiTags('Mobile · Teacher')
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
@RequireRoles(ROLES.TEACHER, ROLES.HOD, ROLES.PRINCIPAL)
@Controller('mobile/teacher')
export class MobileTeacherController {
  constructor(
    private readonly access: MobileAccessService,
    private readonly assignments: AssignmentsService,
    private readonly students: StudentsService,
    private readonly records: StudentRecordsService,
    private readonly teacherApp: TeacherAppService,
  ) {}

  @Get('classes')
  @ApiOperation({
    summary: 'My classes this year: class teacher sections first, then sections I teach, with my subjects',
  })
  @ApiEnvelope(TeacherClassDto, { isArray: true })
  classes(@CurrentUser() user: AuthUser) {
    return this.assignments.teacherClasses(this.access.teacherSchool(user), user.id);
  }

  @Get('sections/:id/students')
  @ApiOperation({
    summary: 'Class roster in roll number order, with fee status for the class teacher',
    description:
      'fee is filled only for the class teacher of the section (paid, partly_paid, due, overdue with balance and next due date). For rank order use GET /mobile/teacher/sections/{id}/ranking.',
  })
  @ApiEnvelope(RosterStudentDto, { isArray: true })
  @ApiErrors(HttpStatus.NOT_FOUND)
  async roster(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    const schoolId = this.access.teacherSchool(user);
    await this.assignments.assertTeachesSection(schoolId, user.id, id);
    const classTeacher = (await this.access.classTeacherSections(schoolId, user.id)).includes(id);
    return this.teacherApp.roster(schoolId, id, classTeacher);
  }

  @Get('students/:id')
  @ApiOperation({ summary: 'Student detail (read-only) for a student in one of my sections' })
  @ApiEnvelope(StudentDetailDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  async student(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    const schoolId = this.access.teacherSchool(user);
    await this.assignments.assertTeachesStudent(schoolId, user.id, id);
    return this.students.get(schoolId, id);
  }

  @Get('students/:id/behaviour')
  @ApiOperation({ summary: 'Behaviour notes of a student in one of my sections' })
  @ApiEnvelope(BehaviourNoteDto, { isArray: true })
  @ApiErrors(HttpStatus.NOT_FOUND)
  async behaviour(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    const schoolId = this.access.teacherSchool(user);
    await this.assignments.assertTeachesStudent(schoolId, user.id, id);
    return this.records.listBehaviour(schoolId, id);
  }

  @Post('students/:id/behaviour')
  @ResponseMessage('Note added')
  @ApiOperation({ summary: 'Add a behaviour note. Parents see it unless visible_to_parent is false.' })
  @ApiEnvelope(BehaviourNoteDto, { status: HttpStatus.CREATED, message: 'Note added' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async addBehaviour(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BehaviourInputDto,
  ) {
    const schoolId = this.access.teacherSchool(user);
    await this.assignments.assertTeachesStudent(schoolId, user.id, id);
    return this.records.addBehaviour(schoolId, id, dto);
  }
}
