import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, AuthUser, CurrentUser, RequirePermissions, ResponseMessage } from '@app/common';
import { PERMISSIONS } from '../access/access.catalog';
import {
  DispatchResultDto,
  OutboxInsightsDto,
  OutboxItemDto,
  OutboxQueryDto,
  SendTestDto,
  TemplateDto,
} from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Admin · Notifications')
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS_VIEW)
  @ApiOperation({
    summary: 'Outbox: every in-app, push and SMS message with its delivery status',
    description:
      'search matches title, body, recipient, template and user name or mobile. sort: created_at, status, channel.',
  })
  @ApiEnvelope(OutboxItemDto, { paginated: true })
  outbox(@Query() query: OutboxQueryDto, @CurrentUser() actor: AuthUser) {
    return this.notifications.outbox(query, actor);
  }

  @Get('insights')
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS_VIEW)
  @ApiOperation({ summary: 'Delivery counts for the last 24 hours' })
  @ApiEnvelope(OutboxInsightsDto)
  insights(@CurrentUser() actor: AuthUser) {
    return this.notifications.outboxInsights(actor);
  }

  @Get('templates')
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS_VIEW)
  @ApiOperation({ summary: 'Message templates in English and Tamil' })
  @ApiEnvelope(TemplateDto, { isArray: true })
  templates() {
    return this.notifications.listTemplates();
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS_SEND)
  @ResponseMessage('Test notification queued')
  @ApiOperation({ summary: 'Send a test notification (in-app, push, SMS fallback) to one user' })
  @ApiEnvelope(DispatchResultDto, { message: 'Test notification queued' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  test(@Body() dto: SendTestDto, @CurrentUser() actor: AuthUser) {
    return this.notifications.sendTest(dto.user_id, actor);
  }
}
