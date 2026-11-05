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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, AuthUser, CurrentUser, RequireRoles, ResponseMessage } from '@app/common';
import { ROLES } from '../access/access.catalog';
import {
  MeetingMessageDto,
  MeetingMessageInputDto,
  MeetingMessagesPageDto,
  MeetingMessagesQueryDto,
  MeetingNoteDto,
  MeetingRecapDto,
  ParentNoteInputDto,
  TeacherNoteInputDto,
  TeacherNoteUpdateDto,
} from '../meetings/dto/meeting-records.dto';
import { MeetingRecordsService } from '../meetings/meeting-records.service';

const NOTES_DESCRIPTION =
  'My own notes plus the teacher’s shared notes, oldest first. Allowed before, during and after the meeting; ' +
  '409 MEETING_CANCELLED for a cancelled meeting. Current academic year only.';
const CHAT_DESCRIPTION =
  'Text or a file (upload with POST /files first). Open from 10 minutes before the start until the meeting ends; ' +
  'both people get the socket event meeting.message on /comm. 409 MEETING_NOT_OPEN, MEETING_CHAT_CLOSED or MEETING_CANCELLED.';
const RECAP_DESCRIPTION =
  'After a completed or missed meeting: the meeting, how long each person was in the call, the notes I may see and the chat. ' +
  '409 MEETING_NOT_OVER while it is still open; 409 MEETING_CANCELLED.';

@ApiTags('Mobile · Teacher')
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
@RequireRoles(ROLES.TEACHER, ROLES.HOD, ROLES.PRINCIPAL)
@Controller('mobile/teacher/meetings/:meetingId')
export class MobileTeacherMeetingRecordsController {
  constructor(private readonly records: MeetingRecordsService) {}

  @Get('notes')
  @ApiOperation({ summary: 'Meeting notes', description: NOTES_DESCRIPTION })
  @ApiEnvelope(MeetingNoteDto, { isArray: true })
  notes(@CurrentUser() user: AuthUser, @Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.records.listNotes(user, 'teacher', meetingId);
  }

  @Post('notes')
  @ApiOperation({
    summary: 'Add a note. shared: true shows it to the parent and sends them a notification.',
    description: NOTES_DESCRIPTION,
  })
  @ResponseMessage('Note saved')
  @ApiEnvelope(MeetingNoteDto, { status: HttpStatus.CREATED, message: 'Note saved' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  addNote(
    @CurrentUser() user: AuthUser,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Body() dto: TeacherNoteInputDto,
  ) {
    return this.records.addNote(user, 'teacher', meetingId, dto);
  }

  @Patch('notes/:noteId')
  @ApiOperation({
    summary: 'Edit my note or share it with the parent (sharing tells the parent once)',
    description: '404 NOTE_NOT_FOUND for someone else’s note.',
  })
  @ResponseMessage('Note saved')
  @ApiEnvelope(MeetingNoteDto, { message: 'Note saved' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  updateNote(
    @CurrentUser() user: AuthUser,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Param('noteId', ParseIntPipe) noteId: number,
    @Body() dto: TeacherNoteUpdateDto,
  ) {
    return this.records.updateNote(user, 'teacher', meetingId, noteId, dto);
  }

  @Delete('notes/:noteId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete my note' })
  @ResponseMessage('Note deleted')
  removeNote(
    @CurrentUser() user: AuthUser,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Param('noteId', ParseIntPipe) noteId: number,
  ) {
    return this.records.removeNote(user, 'teacher', meetingId, noteId);
  }

  @Get('messages')
  @ApiOperation({ summary: 'Meeting chat, newest first; scroll up with before_id' })
  @ApiEnvelope(MeetingMessagesPageDto)
  messages(
    @CurrentUser() user: AuthUser,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Query() query: MeetingMessagesQueryDto,
  ) {
    return this.records.history(user, 'teacher', meetingId, query);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send a message in the meeting chat', description: CHAT_DESCRIPTION })
  @ResponseMessage('Message sent')
  @ApiEnvelope(MeetingMessageDto, { status: HttpStatus.CREATED, message: 'Message sent' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  send(
    @CurrentUser() user: AuthUser,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Body() dto: MeetingMessageInputDto,
  ) {
    return this.records.send(user, 'teacher', meetingId, dto);
  }

  @Get('recap')
  @ApiOperation({ summary: 'Meeting recap', description: RECAP_DESCRIPTION })
  @ApiEnvelope(MeetingRecapDto)
  @ApiErrors(HttpStatus.CONFLICT)
  recap(@CurrentUser() user: AuthUser, @Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.records.recap(user, 'teacher', meetingId);
  }
}

@ApiTags('Mobile · Parent')
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
@RequireRoles(ROLES.PARENT)
@Controller('mobile/parent/meetings/:meetingId')
export class MobileParentMeetingRecordsController {
  constructor(private readonly records: MeetingRecordsService) {}

  @Get('notes')
  @ApiOperation({
    summary: 'Meeting notes: my private notes and the notes the teacher shared',
    description: NOTES_DESCRIPTION,
  })
  @ApiEnvelope(MeetingNoteDto, { isArray: true })
  notes(@CurrentUser() user: AuthUser, @Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.records.listNotes(user, 'parent', meetingId);
  }

  @Post('notes')
  @ApiOperation({ summary: 'Add a private note (only I see it)', description: NOTES_DESCRIPTION })
  @ResponseMessage('Note saved')
  @ApiEnvelope(MeetingNoteDto, { status: HttpStatus.CREATED, message: 'Note saved' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  addNote(
    @CurrentUser() user: AuthUser,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Body() dto: ParentNoteInputDto,
  ) {
    return this.records.addNote(user, 'parent', meetingId, dto);
  }

  @Patch('notes/:noteId')
  @ApiOperation({ summary: 'Edit my note', description: '404 NOTE_NOT_FOUND for the teacher’s notes.' })
  @ResponseMessage('Note saved')
  @ApiEnvelope(MeetingNoteDto, { message: 'Note saved' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  updateNote(
    @CurrentUser() user: AuthUser,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Param('noteId', ParseIntPipe) noteId: number,
    @Body() dto: ParentNoteInputDto,
  ) {
    return this.records.updateNote(user, 'parent', meetingId, noteId, dto);
  }

  @Delete('notes/:noteId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete my note' })
  @ResponseMessage('Note deleted')
  removeNote(
    @CurrentUser() user: AuthUser,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Param('noteId', ParseIntPipe) noteId: number,
  ) {
    return this.records.removeNote(user, 'parent', meetingId, noteId);
  }

  @Get('messages')
  @ApiOperation({ summary: 'Meeting chat, newest first; scroll up with before_id' })
  @ApiEnvelope(MeetingMessagesPageDto)
  messages(
    @CurrentUser() user: AuthUser,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Query() query: MeetingMessagesQueryDto,
  ) {
    return this.records.history(user, 'parent', meetingId, query);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send a message in the meeting chat', description: CHAT_DESCRIPTION })
  @ResponseMessage('Message sent')
  @ApiEnvelope(MeetingMessageDto, { status: HttpStatus.CREATED, message: 'Message sent' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  send(
    @CurrentUser() user: AuthUser,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Body() dto: MeetingMessageInputDto,
  ) {
    return this.records.send(user, 'parent', meetingId, dto);
  }

  @Get('recap')
  @ApiOperation({ summary: 'Meeting recap', description: RECAP_DESCRIPTION })
  @ApiEnvelope(MeetingRecapDto)
  @ApiErrors(HttpStatus.CONFLICT)
  recap(@CurrentUser() user: AuthUser, @Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.records.recap(user, 'parent', meetingId);
  }
}
