import { Controller, Get, HttpStatus, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, AuthUser, CurrentUser, PaginationDto, RequirePermissions } from '@app/common';
import { ApiSchoolHeader, SchoolId } from '../../shared/school-context';
import { PERMISSIONS } from '../access/access.catalog';
import { AchievementDto } from '../achievements/dto/achievement.dto';
import { MyAnnouncementDto, MyAnnouncementsQueryDto } from '../announcements/dto/announcement.dto';
import { ChatThreadDto, MessagesPageDto, MessagesQueryDto } from '../chat/dto/chat.dto';
import { DiaryFeedItemDto, ParentDiaryQueryDto } from '../diary/dto/diary.dto';
import { MeetingDto, MobileMeetingQueryDto } from '../meetings/dto/meeting.dto';
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

  @Get('diary')
  @RequirePermissions(PERMISSIONS.STUDENTS_VIEW, PERMISSIONS.DIARY_VIEW)
  @ApiOperation({
    summary: 'Diary feed the parent sees for this child: published posts, newest first (current academic year)',
  })
  @ApiEnvelope(DiaryFeedItemDto, { paginated: true })
  diary(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number, @Query() query: ParentDiaryQueryDto) {
    return this.preview.diary(schoolId, id, query);
  }

  @Get('meetings')
  @RequirePermissions(PERMISSIONS.STUDENTS_VIEW, PERMISSIONS.MEETINGS_VIEW)
  @ApiOperation({
    summary: 'Meetings of the primary parent about this child (same as /mobile/parent/meetings?student_id=)',
    description: 'Empty when no parent can sign in. Read-only: calls happen in the mobile app.',
  })
  @ApiEnvelope(MeetingDto, { paginated: true })
  meetings(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number, @Query() query: MobileMeetingQueryDto) {
    return this.preview.meetings(schoolId, id, query);
  }

  @Get('chat')
  @RequirePermissions(PERMISSIONS.STUDENTS_VIEW, PERMISSIONS.CHAT_AUDIT)
  @ApiOperation({ summary: 'Chat threads of the primary parent about this child, latest first' })
  @ApiEnvelope(ChatThreadDto, { paginated: true })
  chat(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number, @Query() query: PaginationDto) {
    return this.preview.chatThreads(schoolId, id, query);
  }

  @Get('chat/:threadId/messages')
  @RequirePermissions(PERMISSIONS.STUDENTS_VIEW, PERMISSIONS.CHAT_AUDIT)
  @ApiOperation({
    summary: 'Messages of one thread as the parent sees them, newest first',
    description: 'Every read is written to the chat access log (viewed_thread) under your name.',
  })
  @ApiEnvelope(MessagesPageDto)
  chatMessages(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('threadId', ParseIntPipe) threadId: number,
    @Query() query: MessagesQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.preview.chatMessages(schoolId, id, threadId, query, user);
  }

  @Get('announcements')
  @RequirePermissions(PERMISSIONS.STUDENTS_VIEW, PERMISSIONS.ANNOUNCEMENTS_VIEW)
  @ApiOperation({ summary: 'Announcements in the primary parent’s app, newest first, with read state' })
  @ApiEnvelope(MyAnnouncementDto, { paginated: true })
  announcements(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: MyAnnouncementsQueryDto,
  ) {
    return this.preview.announcements(schoolId, id, query);
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
