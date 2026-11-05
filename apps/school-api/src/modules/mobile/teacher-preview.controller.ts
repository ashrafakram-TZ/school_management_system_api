import { Controller, Get, HttpStatus, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, AuthUser, CurrentUser, RequirePermissions } from '@app/common';
import { ApiSchoolHeader, SchoolId } from '../../shared/school-context';
import { PERMISSIONS } from '../access/access.catalog';
import { MyAnnouncementDto, MyAnnouncementsQueryDto } from '../announcements/dto/announcement.dto';
import { ChatThreadDto, MessagesPageDto, MessagesQueryDto, ThreadsQueryDto } from '../chat/dto/chat.dto';
import { DiaryEntryDto, TeacherDiaryQueryDto } from '../diary/dto/diary.dto';
import { MeetingDto, MobileMeetingQueryDto } from '../meetings/dto/meeting.dto';
import { TeacherPreviewDto } from './dto/teacher-preview.dto';
import { TeacherPreviewService } from './teacher-preview.service';

@ApiTags('Admin · Teacher app preview')
@ApiBearerAuth()
@ApiSchoolHeader()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.BAD_REQUEST)
@RequirePermissions(PERMISSIONS.STAFF_VIEW)
@Controller('admin/staff/:id/teacher-view')
export class TeacherPreviewController {
  constructor(private readonly preview: TeacherPreviewService) {}

  @Get()
  @ApiOperation({
    summary: 'Teacher app home: profile, today’s timetable, my classes and badge counts',
    description:
      'Read-only, :id is the staff id. Uses the same services as /mobile/teacher/timetable/today and /mobile/teacher/classes. NOT_A_TEACHER for non-teaching staff.',
  })
  @ApiEnvelope(TeacherPreviewDto)
  home(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number) {
    return this.preview.home(schoolId, id);
  }

  @Get('diary')
  @RequirePermissions(PERMISSIONS.STAFF_VIEW, PERMISSIONS.DIARY_VIEW)
  @ApiOperation({ summary: 'Diary posts this teacher wrote, newest first (same as /mobile/teacher/diary)' })
  @ApiEnvelope(DiaryEntryDto, { paginated: true })
  diary(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number, @Query() query: TeacherDiaryQueryDto) {
    return this.preview.diary(schoolId, id, query);
  }

  @Get('meetings')
  @RequirePermissions(PERMISSIONS.STAFF_VIEW, PERMISSIONS.MEETINGS_VIEW)
  @ApiOperation({
    summary: 'Meetings of this teacher with parents (same as /mobile/teacher/meetings)',
    description: 'Read-only: calls happen in the mobile app.',
  })
  @ApiEnvelope(MeetingDto, { paginated: true })
  meetings(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number, @Query() query: MobileMeetingQueryDto) {
    return this.preview.meetings(schoolId, id, query);
  }

  @Get('chat')
  @RequirePermissions(PERMISSIONS.STAFF_VIEW, PERMISSIONS.CHAT_AUDIT)
  @ApiOperation({ summary: 'Chat threads of this teacher with parents, latest first' })
  @ApiEnvelope(ChatThreadDto, { paginated: true })
  chat(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number, @Query() query: ThreadsQueryDto) {
    return this.preview.chatThreads(schoolId, id, query);
  }

  @Get('chat/:threadId/messages')
  @RequirePermissions(PERMISSIONS.STAFF_VIEW, PERMISSIONS.CHAT_AUDIT)
  @ApiOperation({
    summary: 'Messages of one thread as the teacher sees them, newest first',
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
  @RequirePermissions(PERMISSIONS.STAFF_VIEW, PERMISSIONS.ANNOUNCEMENTS_VIEW)
  @ApiOperation({ summary: 'Announcements in this teacher’s app, newest first, with read state' })
  @ApiEnvelope(MyAnnouncementDto, { paginated: true })
  announcements(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: MyAnnouncementsQueryDto,
  ) {
    return this.preview.announcements(schoolId, id, query);
  }
}
