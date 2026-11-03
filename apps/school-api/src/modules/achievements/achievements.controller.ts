import { Body, Controller, Delete, Get, HttpStatus, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, AuthUser, CurrentUser, RequirePermissions, ResponseMessage } from '@app/common';
import { ApiSchoolHeader, SchoolId } from '../../shared/school-context';
import { PERMISSIONS } from '../access/access.catalog';
import { AchievementsService } from './achievements.service';
import { AchievementDto, AchievementInputDto, UpdateAchievementDto } from './dto/achievement.dto';

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
