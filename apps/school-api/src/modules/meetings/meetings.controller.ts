import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiBody, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, Public, RequirePermissions } from '@app/common';
import { ApiSchoolHeader, SchoolId } from '../../shared/school-context';
import { PERMISSIONS } from '../access/access.catalog';
import { MeetingDetailDto, MeetingDto, MeetingInsightsDto, MeetingQueryDto } from './dto/meeting.dto';
import { MeetingsService } from './meetings.service';

@ApiTags('Admin · Meetings')
@ApiBearerAuth()
@ApiSchoolHeader()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
@RequirePermissions(PERMISSIONS.MEETINGS_VIEW)
@Controller('admin/meetings')
export class MeetingsController {
  constructor(private readonly meetings: MeetingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Teacher and parent video meetings: who booked it, with whom, about which student, when and status',
    description:
      'Read-only. Meetings are booked and joined in the Flutter app. Sort: scheduled_at (default), created_at, status, title.',
  })
  @ApiEnvelope(MeetingDto, { paginated: true })
  @ApiErrors(HttpStatus.BAD_REQUEST)
  list(@SchoolId() schoolId: number, @Query() query: MeetingQueryDto) {
    return this.meetings.list(schoolId, query);
  }

  @Get('insights')
  @ApiOperation({ summary: 'Counts for the insight cards: today, upcoming, live, completed, missed, cancelled' })
  @ApiEnvelope(MeetingInsightsDto)
  insights(@SchoolId() schoolId: number) {
    return this.meetings.insights(schoolId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One meeting with its call log (every join and leave)' })
  @ApiEnvelope(MeetingDetailDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  detail(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number) {
    return this.meetings.detail(schoolId, id);
  }
}

@ApiTags('Integrations')
@Controller('integrations/agora')
export class AgoraWebhookController {
  constructor(private readonly meetings: MeetingsService) {}

  @Post('events')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiHeader({
    name: 'Agora-Signature-V2',
    required: true,
    description: 'HMAC-SHA256 (hex) of the raw body with AGORA_WEBHOOK_SECRET',
  })
  @ApiOperation({
    summary: 'Agora Notifications: users joining and leaving meeting channels (events 103–108)',
    description:
      'Server to server only. Fills the call log with what Agora saw, including network drops. Safe to receive twice.',
  })
  @ApiBody({ schema: { type: 'object' } })
  receive(@Req() request: RawBodyRequest<Request>, @Headers('agora-signature-v2') signature?: string) {
    return this.meetings.receiveAgoraEvent(request.rawBody, signature);
  }
}
