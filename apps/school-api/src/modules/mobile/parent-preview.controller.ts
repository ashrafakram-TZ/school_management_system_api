import { Controller, Get, HttpStatus, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, AppException, AuthUser, CurrentUser, PaginationDto } from '@app/common';
import { ApiSchoolHeader, SchoolId } from '../../shared/school-context';
import { PERMISSIONS, ROLES } from '../access/access.catalog';
import { AchievementDto } from '../achievements/dto/achievement.dto';
import { MyAnnouncementDto, MyAnnouncementsQueryDto } from '../announcements/dto/announcement.dto';
import { ChatThreadDto, MessagesPageDto, MessagesQueryDto } from '../chat/dto/chat.dto';
import { DiaryFeedItemDto, ParentDiaryQueryDto } from '../diary/dto/diary.dto';
import { MeetingDto, MobileMeetingQueryDto } from '../meetings/dto/meeting.dto';
import { MyNotificationDto, MyNotificationsQueryDto } from '../notifications/dto/notification.dto';
import { ChildBusDto } from '../tracking/dto/tracking.dto';
import { ParentPreviewDto } from './dto/parent-preview.dto';
import { MobileAccessService } from './mobile-access.service';
import { ParentPreviewService } from './parent-preview.service';

@ApiTags('Admin · Parent app preview')
@ApiBearerAuth()
@ApiSchoolHeader()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
@Controller('admin/students/:id/parent-view')
export class ParentPreviewController {
  constructor(
    private readonly preview: ParentPreviewService,
    private readonly mobileAccess: MobileAccessService,
  ) {}

  private async assertAccess(user: AuthUser, studentId: number, requiredPermission?: string): Promise<void> {
    if (requiredPermission && user.permissions?.includes(requiredPermission)) return;
    if (user.permissions?.includes(PERMISSIONS.STUDENTS_VIEW)) return;
    if (user.roles?.includes(ROLES.PARENT)) {
      await this.mobileAccess.childSchool(user.id, studentId);
      return;
    }
    throw AppException.forbidden();
  }

  @Get()
  @ApiOperation({
    summary: 'Parent app home for a student: the child card the parent sees and today’s attendance',
    description: 'Read-only. Uses the same services as /mobile/parent/children/:id and .../attendance/today.',
  })
  @ApiEnvelope(ParentPreviewDto)
  async home(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    await this.assertAccess(user, id);
    return this.preview.home(schoolId, id);
  }

  @Get('bus')
  @ApiOperation({
    summary: 'Bus card the parent sees: status, headline, stop, trip and ETA (same as /mobile/parent/children/:id/bus)',
    description: 'null when the student does not use the bus.',
  })
  @ApiEnvelope(ChildBusDto)
  async bus(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    await this.assertAccess(user, id);
    return this.preview.bus(schoolId, id);
  }

  @Get('achievements')
  @ApiOperation({ summary: 'Achievements shared with parents, newest first (same as the parent app)' })
  @ApiEnvelope(AchievementDto, { isArray: true })
  async achievements(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    await this.assertAccess(user, id);
    return this.preview.achievements(schoolId, id);
  }

  @Get('diary')
  @ApiOperation({
    summary: 'Diary feed the parent sees for this child: published posts, newest first (current academic year)',
  })
  @ApiEnvelope(DiaryFeedItemDto, { paginated: true })
  async diary(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ParentDiaryQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.assertAccess(user, id, PERMISSIONS.DIARY_VIEW);
    return this.preview.diary(schoolId, id, query);
  }

  @Get('meetings')
  @ApiOperation({
    summary: 'Meetings of the primary parent about this child (same as /mobile/parent/meetings?student_id=)',
    description: 'Empty when no parent can sign in. Read-only: calls happen in the mobile app.',
  })
  @ApiEnvelope(MeetingDto, { paginated: true })
  async meetings(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: MobileMeetingQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.assertAccess(user, id, PERMISSIONS.MEETINGS_VIEW);
    return this.preview.meetings(schoolId, id, query);
  }

  @Get('chat')
  @ApiOperation({ summary: 'Chat threads of the primary parent about this child, latest first' })
  @ApiEnvelope(ChatThreadDto, { paginated: true })
  async chat(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PaginationDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.assertAccess(user, id, PERMISSIONS.CHAT_AUDIT);
    return this.preview.chatThreads(schoolId, id, query);
  }

  @Get('chat/:threadId/messages')
  @ApiOperation({
    summary: 'Messages of one thread as the parent sees them, newest first',
    description: 'Every read is written to the chat access log (viewed_thread) under your name.',
  })
  @ApiEnvelope(MessagesPageDto)
  async chatMessages(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('threadId', ParseIntPipe) threadId: number,
    @Query() query: MessagesQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.assertAccess(user, id, PERMISSIONS.CHAT_AUDIT);
    return this.preview.chatMessages(schoolId, id, threadId, query, user);
  }

  @Get('announcements')
  @ApiOperation({ summary: 'Announcements in the primary parent’s app, newest first, with read state' })
  @ApiEnvelope(MyAnnouncementDto, { paginated: true })
  async announcements(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: MyAnnouncementsQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.assertAccess(user, id, PERMISSIONS.ANNOUNCEMENTS_VIEW);
    return this.preview.announcements(schoolId, id, query);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'In-app notifications of the student’s primary parent, newest first' })
  @ApiEnvelope(MyNotificationDto, { paginated: true })
  async notifications(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: MyNotificationsQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.assertAccess(user, id);
    return this.preview.notifications(schoolId, id, query);
  }
}
