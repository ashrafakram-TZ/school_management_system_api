import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, AuthUser, CurrentUser, RequireRoles, ResponseMessage } from '@app/common';
import { ROLES } from '../access/access.catalog';
import { ChatService } from '../chat/chat.service';
import {
  ChatMessageDto,
  ChatThreadDto,
  FlagMessageDto,
  MessagesPageDto,
  MessagesQueryDto,
  ParentThreadInputDto,
  ReadReceiptDto,
  SendMessageDto,
  TeacherThreadInputDto,
  ThreadsQueryDto,
} from '../chat/dto/chat.dto';
import { MobileAccessService } from './mobile-access.service';

const REALTIME =
  'Live updates on socket.io namespace /comm with { auth: { token } }: chat.message, chat.read, chat.updated, chat.typing ' +
  '(send chat.typing { thread_id }).';

@ApiTags('Mobile · Teacher')
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
@RequireRoles(ROLES.TEACHER, ROLES.HOD, ROLES.PRINCIPAL)
@Controller('mobile/teacher/chat')
export class MobileTeacherChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('threads')
  @ApiOperation({
    summary: 'My conversations with parents this academic year, latest first, with unread counts',
    description: REALTIME,
  })
  @ApiEnvelope(ChatThreadDto, { paginated: true })
  threads(@CurrentUser() user: AuthUser, @Query() query: ThreadsQueryDto) {
    return this.chat.myThreads(user, 'teacher', query);
  }

  @Post('threads')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Open (or reuse) the conversation with a parent of a student I teach',
    description: '403 NOT_YOUR_SECTION; 409 NO_PARENT_ACCOUNT',
  })
  @ApiEnvelope(ChatThreadDto)
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  open(@CurrentUser() user: AuthUser, @Body() dto: TeacherThreadInputDto) {
    return this.chat.openAsTeacher(user, dto);
  }

  @Get('threads/:id')
  @ApiOperation({ summary: 'One conversation' })
  @ApiEnvelope(ChatThreadDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  thread(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.chat.thread(user, 'teacher', id);
  }

  @Get('threads/:id/messages')
  @ApiOperation({ summary: 'Messages, newest first; pass before_id to load older ones' })
  @ApiEnvelope(MessagesPageDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  messages(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Query() query: MessagesQueryDto) {
    return this.chat.history(user, 'teacher', id, query);
  }

  @Post('threads/:id/messages')
  @ResponseMessage('Message sent')
  @ApiOperation({ summary: 'Send a message or a file to the parent (push to the parent at once)' })
  @ApiEnvelope(ChatMessageDto, { status: HttpStatus.CREATED, message: 'Message sent' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  send(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: SendMessageDto) {
    return this.chat.send(user, 'teacher', id, dto);
  }

  @Post('threads/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'I opened the conversation: parent messages get read receipts' })
  @ApiEnvelope(ReadReceiptDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  read(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.chat.markRead(user, 'teacher', id);
  }

  @Post('threads/:id/messages/:messageId/flag')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Message reported to the office')
  @ApiOperation({ summary: 'Report a parent message to the office' })
  @ApiEnvelope(ChatMessageDto, { message: 'Message reported to the office' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  flag(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body() dto: FlagMessageDto,
  ) {
    return this.chat.flag(user, 'teacher', id, messageId, dto.reason);
  }
}

@ApiTags('Mobile · Parent')
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
@RequireRoles(ROLES.PARENT)
@Controller('mobile/parent')
export class MobileParentChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly access: MobileAccessService,
  ) {}

  @Get('chat/threads')
  @ApiOperation({ summary: 'My conversations with teachers this academic year, every child', description: REALTIME })
  @ApiEnvelope(ChatThreadDto, { paginated: true })
  threads(@CurrentUser() user: AuthUser, @Query() query: ThreadsQueryDto) {
    return this.chat.myThreads(user, 'parent', query);
  }

  @Post('children/:id/chat/threads')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Open (or reuse) the conversation with one of the child’s teachers',
    description: 'office_hours says when the teacher will be told about messages sent now.',
  })
  @ApiEnvelope(ChatThreadDto)
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async open(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ParentThreadInputDto) {
    return this.chat.openAsParent(await this.access.childSchool(user.id, id), id, dto, user);
  }

  @Get('chat/threads/:id')
  @ApiOperation({ summary: 'One conversation with office hours' })
  @ApiEnvelope(ChatThreadDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  thread(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.chat.thread(user, 'parent', id);
  }

  @Get('chat/threads/:id/messages')
  @ApiOperation({ summary: 'Messages, newest first; pass before_id to load older ones' })
  @ApiEnvelope(MessagesPageDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  messages(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Query() query: MessagesQueryDto) {
    return this.chat.history(user, 'parent', id, query);
  }

  @Post('chat/threads/:id/messages')
  @ResponseMessage('Message sent')
  @ApiOperation({
    summary: 'Send a message or a file to the teacher',
    description:
      'Outside office hours (Monday to Saturday, not holidays) the message is saved and the teacher is told when office hours start: held_for_office_hours is true.',
  })
  @ApiEnvelope(ChatMessageDto, { status: HttpStatus.CREATED, message: 'Message sent' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  send(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: SendMessageDto) {
    return this.chat.send(user, 'parent', id, dto);
  }

  @Post('chat/threads/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'I opened the conversation: teacher messages get read receipts' })
  @ApiEnvelope(ReadReceiptDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  read(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.chat.markRead(user, 'parent', id);
  }

  @Post('chat/threads/:id/messages/:messageId/flag')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Message reported to the office')
  @ApiOperation({ summary: 'Report a teacher message to the office' })
  @ApiEnvelope(ChatMessageDto, { message: 'Message reported to the office' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  flag(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body() dto: FlagMessageDto,
  ) {
    return this.chat.flag(user, 'parent', id, messageId, dto.reason);
  }
}
