import { Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, AuthUser, CurrentUser, ResponseMessage } from '@app/common';
import { MyNotificationDto, MyNotificationsQueryDto, UnreadCountDto } from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Me · Notifications')
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED)
@Controller('me/notifications')
export class MeNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'In-app notification centre, newest first' })
  @ApiEnvelope(MyNotificationDto, { paginated: true })
  list(@CurrentUser() user: AuthUser, @Query() query: MyNotificationsQueryDto) {
    return this.notifications.mine(user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Number for the bell badge' })
  @ApiEnvelope(UnreadCountDto)
  async unreadCount(@CurrentUser() user: AuthUser): Promise<UnreadCountDto> {
    return { unread: await this.notifications.unreadCount(user.id) };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('All notifications marked as read')
  @ApiOperation({ summary: 'Mark every notification as read' })
  readAll(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.id);
  }

  @Patch(':id/read')
  @ResponseMessage('Notification marked as read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  @ApiEnvelope(MyNotificationDto, { message: 'Notification marked as read' })
  @ApiErrors(HttpStatus.NOT_FOUND)
  read(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.notifications.markRead(user.id, id);
  }
}
