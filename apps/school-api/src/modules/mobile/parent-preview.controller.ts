import { Controller, Get, HttpStatus, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, RequirePermissions } from '@app/common';
import { ApiSchoolHeader, SchoolId } from '../../shared/school-context';
import { PERMISSIONS } from '../access/access.catalog';
import { AchievementDto } from '../achievements/dto/achievement.dto';
import { MyNotificationDto, MyNotificationsQueryDto } from '../notifications/dto/notification.dto';
import { ChildBusDto } from '../tracking/dto/tracking.dto';
import { ParentPreviewDto } from './dto/parent-preview.dto';
import { ParentPreviewService } from './parent-preview.service';

@ApiTags('Admin · Parent app preview')
@ApiBearerAuth()
@ApiSchoolHeader()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
@RequirePermissions(PERMISSIONS.STUDENTS_VIEW)
@Controller('admin/students/:id/parent-view')
export class ParentPreviewController {
  constructor(private readonly preview: ParentPreviewService) {}

  @Get()
  @ApiOperation({
    summary: 'Parent app home for a student: the child card the parent sees and today’s attendance',
    description: 'Read-only. Uses the same services as /mobile/parent/children/:id and .../attendance/today.',
  })
  @ApiEnvelope(ParentPreviewDto)
  home(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number) {
    return this.preview.home(schoolId, id);
  }

  @Get('bus')
  @ApiOperation({
    summary: 'Bus card the parent sees: status, headline, stop, trip and ETA (same as /mobile/parent/children/:id/bus)',
    description: 'null when the student does not use the bus.',
  })
  @ApiEnvelope(ChildBusDto)
  bus(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number) {
    return this.preview.bus(schoolId, id);
  }

  @Get('achievements')
  @ApiOperation({ summary: 'Achievements shared with parents, newest first (same as the parent app)' })
  @ApiEnvelope(AchievementDto, { isArray: true })
  achievements(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number) {
    return this.preview.achievements(schoolId, id);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'In-app notifications of the student’s primary parent, newest first' })
  @ApiEnvelope(MyNotificationDto, { paginated: true })
  notifications(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: MyNotificationsQueryDto,
  ) {
    return this.preview.notifications(schoolId, id, query);
  }
}
