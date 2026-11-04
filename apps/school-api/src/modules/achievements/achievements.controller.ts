import { Body, Controller, Delete, Get, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, AuthUser, CurrentUser, RequirePermissions, ResponseMessage } from '@app/common';
import { ApiSchoolHeader, SchoolId } from '../../shared/school-context';
import { PERMISSIONS } from '../access/access.catalog';
import { AchievementsService } from './achievements.service';
import {
  AchievementDto,
  AchievementFilterDto,
  AchievementInputDto,
  AchievementInsightsDto,
  AchievementListQueryDto,
  LeaderboardDto,
  LeaderboardQueryDto,
  SchoolAchievementDto,
  UpdateAchievementDto,
} from './dto/achievement.dto';

@ApiTags('Admin · Student records')
@ApiBearerAuth()
@ApiSchoolHeader()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
@Controller('admin/students/:id/achievements')
export class AchievementsController {
  constructor(private readonly achievements: AchievementsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.STUDENTS_VIEW)
  @ApiOperation({ summary: 'Achievements of a student, newest first' })
  @ApiEnvelope(AchievementDto, { isArray: true })
  list(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number) {
    return this.achievements.list(schoolId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.STUDENTS_MANAGE)
  @ResponseMessage('Achievement added')
  @ApiOperation({ summary: 'Add an achievement. Parents are told unless visible_to_parent is false.' })
  @ApiEnvelope(AchievementDto, { status: HttpStatus.CREATED, message: 'Achievement added' })
  @ApiErrors(HttpStatus.BAD_REQUEST)
  create(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AchievementInputDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.achievements.create(schoolId, id, dto, actor);
  }

  @Patch(':achievementId')
  @RequirePermissions(PERMISSIONS.STUDENTS_MANAGE)
  @ResponseMessage('Achievement updated')
  @ApiOperation({ summary: 'Edit an achievement' })
  @ApiEnvelope(AchievementDto, { message: 'Achievement updated' })
  @ApiErrors(HttpStatus.BAD_REQUEST)
  update(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('achievementId', ParseIntPipe) achievementId: number,
    @Body() dto: UpdateAchievementDto,
  ) {
    return this.achievements.update(schoolId, id, achievementId, dto);
  }

  @Delete(':achievementId')
  @RequirePermissions(PERMISSIONS.STUDENTS_MANAGE)
  @ResponseMessage('Achievement removed')
  @ApiOperation({ summary: 'Remove an achievement' })
  async remove(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('achievementId', ParseIntPipe) achievementId: number,
  ) {
    await this.achievements.remove(schoolId, id, achievementId);
    return null;
  }
}

@ApiTags('Admin · Sports and activities')
@ApiBearerAuth()
@ApiSchoolHeader()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
@Controller('admin/achievements')
export class SchoolAchievementsController {
  constructor(private readonly achievements: AchievementsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.STUDENTS_VIEW)
  @ApiOperation({
    summary: 'Every achievement in the school (current academic year by default), with filters',
    description:
      'Filter by category (or non_academic), level, result (or podium), event_scope (sports_day, in_school, inter_school, out_of_school), venue_type (indoor, outdoor), participation (individual, team), district_or_above, class_id, section_id, from, to. Search matches the title, team or the student name and admission number.',
  })
  @ApiEnvelope(SchoolAchievementDto, { paginated: true })
  @ApiErrors(HttpStatus.BAD_REQUEST)
  list(@SchoolId() schoolId: number, @Query() query: AchievementListQueryDto) {
    return this.achievements.listSchool(schoolId, query);
  }

  @Get('insights')
  @RequirePermissions(PERMISSIONS.STUDENTS_VIEW)
  @ApiOperation({ summary: 'Counts for the insight cards: total, sports, wins, outside events, district or above' })
  @ApiEnvelope(AchievementInsightsDto)
  insights(@SchoolId() schoolId: number, @Query() query: AchievementFilterDto) {
    return this.achievements.insights(schoolId, query);
  }

  @Get('leaderboard')
  @RequirePermissions(PERMISSIONS.STUDENTS_VIEW)
  @ApiOperation({
    summary: 'Students ranked by achievement points, not only by marks',
    description:
      'Points = level (class 1, school 2, zone 3, district 5, state 8, national 12, international 15) × result (winner 4, runner-up 3, third 2, took part 1). category=sports gives the sports leaderboard; non_academic gives all activities. Equal points share a rank.',
  })
  @ApiEnvelope(LeaderboardDto)
  @ApiErrors(HttpStatus.BAD_REQUEST)
  leaderboard(@SchoolId() schoolId: number, @Query() query: LeaderboardQueryDto) {
    return this.achievements.leaderboard(schoolId, query);
  }
}
