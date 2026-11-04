import { Controller, Get, HttpStatus, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, RequirePermissions } from '@app/common';
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
