import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, AuthUser, CurrentUser, RequirePermissions, ResponseMessage } from '@app/common';
import { ApiSchoolHeader, SchoolId } from '../../shared/school-context';
import { PERMISSIONS } from '../access/access.catalog';
import { AlertDto, AlertInsightsDto, AlertQueryDto, ResolveAlertDto } from './dto/fleet-alert.dto';
import { FleetAlertsService } from './fleet-alerts.service';

@ApiTags('Admin · Fleet alerts')
@ApiBearerAuth()
@ApiSchoolHeader()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
@Controller('admin/fleet/alerts')
export class FleetAlertsController {
  constructor(private readonly alerts: FleetAlertsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.FLEET_VIEW)
  @ApiOperation({
    summary: 'Alerts centre: SOS from drivers and safety alerts from the buses, newest first',
    description:
      'Search the message, bus or driver. Filter by kind, status, severity, vehicle_id, trip_id, from/to (raised date) or active=true (not resolved). sort: raised_at, kind, status, severity. ' +
      'Live: on the /live socket after fleet.subscribe you get alert.raised and alert.updated with the same shape.',
  })
  @ApiEnvelope(AlertDto, { paginated: true })
  @ApiErrors(HttpStatus.BAD_REQUEST)
  list(@SchoolId() schoolId: number, @Query() query: AlertQueryDto) {
    return this.alerts.list(schoolId, query);
  }

  @Get('insights')
  @RequirePermissions(PERMISSIONS.FLEET_VIEW)
  @ApiOperation({ summary: 'Counts for the alert cards: open, SOS active, high active, acknowledged, resolved today' })
  @ApiEnvelope(AlertInsightsDto)
  insights(@SchoolId() schoolId: number) {
    return this.alerts.insights(schoolId);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.FLEET_VIEW)
  @ApiOperation({ summary: 'One alert' })
  @ApiEnvelope(AlertDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  get(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number) {
    return this.alerts.get(schoolId, id);
  }

  @Post(':id/acknowledge')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.FLEET_MANAGE)
  @ResponseMessage('Alert acknowledged')
  @ApiOperation({
    summary: 'Acknowledge: someone in the office is handling it (safe to repeat)',
    description: 'Errors: ALERT_NOT_FOUND (404), ALERT_RESOLVED (409).',
  })
  @ApiEnvelope(AlertDto, { message: 'Alert acknowledged' })
  @ApiErrors(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  acknowledge(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthUser) {
    return this.alerts.acknowledge(schoolId, id, actor);
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.FLEET_MANAGE)
  @ResponseMessage('Alert resolved')
  @ApiOperation({
    summary: 'Resolve with a note of what was done',
    description: 'Errors: VALIDATION_FAILED (400, note missing), ALERT_NOT_FOUND (404), ALERT_ALREADY_RESOLVED (409).',
  })
  @ApiEnvelope(AlertDto, { message: 'Alert resolved' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  resolve(
    @SchoolId() schoolId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolveAlertDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.alerts.resolve(schoolId, id, dto, actor);
  }
}
