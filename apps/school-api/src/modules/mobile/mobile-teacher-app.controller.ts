import { Body, Controller, Get, HttpStatus, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, AuthUser, CurrentUser, RequireRoles, ResponseMessage } from '@app/common';
import { ROLES } from '../access/access.catalog';
import { AchievementsService } from '../achievements/achievements.service';
import {
  AchievementDto,
  AchievementInputDto,
  LeaderboardDto,
  LeaderboardQueryDto,
} from '../achievements/dto/achievement.dto';
import { AssignmentsService } from '../staff/assignments.service';
import { BannerService } from './banner.service';
import { BannerListDto } from './dto/banner.dto';
import { StudentHistoryDto, TodayTimetableDto } from './dto/teacher-app.dto';
import { MobileAccessService } from './mobile-access.service';
import { TeacherAppService } from './teacher-app.service';

@ApiTags('Mobile · Teacher')
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
@RequireRoles(ROLES.TEACHER, ROLES.HOD, ROLES.PRINCIPAL)
@Controller('mobile/teacher')
export class MobileTeacherAppController {
  constructor(
    private readonly access: MobileAccessService,
    private readonly assignments: AssignmentsService,
    private readonly teacherApp: TeacherAppService,
    private readonly achievements: AchievementsService,
    private readonly banner: BannerService,
  ) {}

  @Get('banner')
  @ApiOperation({
    summary: 'Alert banner for the Staff app home screen',
    description: [
      'What needs the teacher’s attention today, most important first (critical, warning, info). Show the first one as the banner, or all as a stack. An empty `banners` list means nothing to show. Switch on `code`; on tap open `action.screen` with `action.params`.',
      '',
      '| code | When | severity | action.screen |',
      '|---|---|---|---|',
      '| HOLIDAY_TODAY | Holiday or Sunday | info | home |',
      '| ON_LEAVE_TODAY | The teacher is on approved leave today | info | timetable |',
      '| CHECK_IN_PENDING | Not checked in yet (warning after the school reporting time) | warning or info | check_in |',
      '| ATTENDANCE_NOT_MARKED | One per class-teacher section with no attendance today | warning | attendance (`section_id`) |',
      '| PROXY_TODAY | Proxy periods given to the teacher today | info | timetable |',
      '| COMBINED_CLASS_TODAY | Students of another section sit in the teacher’s class today | info | timetable |',
      '| LEAVE_REQUESTS_PENDING | Parent leave requests waiting for the class teacher | info | student_leaves |',
      '| UNREAD_ALERTS | Unread in-app notifications | info | notifications |',
    ].join('\n'),
  })
  @ApiEnvelope(BannerListDto)
  banners(@CurrentUser() user: AuthUser) {
    return this.banner.teacher(this.access.teacherSchool(user), user);
  }

  @Get('timetable/today')
  @ApiOperation({
    summary: 'Home: today’s periods in bell order with the class, subject, room, student count and present count',
    description:
      'kind: class (my period), substitute (covering for an absent teacher), free or break. Tap a period’s section to open GET /mobile/teacher/sections/{id}/students. is_now marks the running period.',
  })
  @ApiEnvelope(TodayTimetableDto)
  today(@CurrentUser() user: AuthUser) {
    return this.teacherApp.today(this.access.teacherSchool(user), user);
  }

  @Get('students/:id/history')
  @ApiOperation({
    summary:
      'Student full history: profile and parents, attendance (year and this month), leave, remarks, achievements, health, documents and ID card',
    description: 'Only for students of my sections; others return 403 NOT_YOUR_SECTION.',
  })
  @ApiEnvelope(StudentHistoryDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  async history(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    const schoolId = this.access.teacherSchool(user);
    await this.assignments.assertTeachesStudent(schoolId, user.id, id);
    return this.teacherApp.history(schoolId, id, await this.teacherApp.isClassTeacherOf(schoolId, user.id, id));
  }

  @Get('sections/:id/activity-ranking')
  @ApiOperation({
    summary: 'Students of my section ranked by sports and activity points',
    description:
      'Same points as the admin leaderboard. Default: all non-academic achievements this academic year; send category=sports for sports only.',
  })
  @ApiEnvelope(LeaderboardDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  async activityRanking(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: LeaderboardQueryDto,
  ) {
    const schoolId = this.access.teacherSchool(user);
    await this.assignments.assertTeachesSection(schoolId, user.id, id);
    return this.achievements.leaderboard(schoolId, {
      ...query,
      category: query.category ?? 'non_academic',
      section_id: id,
      class_id: undefined,
      limit: query.limit ?? 100,
    });
  }

  @Get('students/:id/achievements')
  @ApiOperation({ summary: 'Achievements of a student in my sections' })
  @ApiEnvelope(AchievementDto, { isArray: true })
  @ApiErrors(HttpStatus.NOT_FOUND)
  async listAchievements(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    const schoolId = this.access.teacherSchool(user);
    await this.assignments.assertTeachesStudent(schoolId, user.id, id);
    return this.achievements.list(schoolId, id);
  }

  @Post('students/:id/achievements')
  @ResponseMessage('Achievement added')
  @ApiOperation({ summary: 'Add an achievement for a student in my sections. Parents are told.' })
  @ApiEnvelope(AchievementDto, { status: HttpStatus.CREATED, message: 'Achievement added' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async addAchievement(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AchievementInputDto,
  ) {
    const schoolId = this.access.teacherSchool(user);
    await this.assignments.assertTeachesStudent(schoolId, user.id, id);
    return this.achievements.create(schoolId, id, dto, user);
  }
}

@ApiTags('Mobile · Parent')
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
@RequireRoles(ROLES.PARENT)
@Controller('mobile/parent/children/:id')
export class MobileParentAchievementsController {
  constructor(
    private readonly access: MobileAccessService,
    private readonly achievements: AchievementsService,
  ) {}

  @Get('achievements')
  @ApiOperation({ summary: 'Achievements the school shares with parents, newest first' })
  @ApiEnvelope(AchievementDto, { isArray: true })
  async list(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.achievements.list(await this.access.childSchool(user.id, id), id, { parent: true });
  }
}
