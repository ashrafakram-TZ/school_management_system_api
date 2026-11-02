import { Controller, Get, HttpStatus, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, Paginated, RequirePermissions } from '@app/common';
import { PERMISSIONS } from '../access/access.catalog';
import { FleetLiveDto, PositionHistoryDto, PositionQueryDto, VehicleStatusDto } from './dto/fleet.dto';
import { TelematicsClient } from './telematics.client';

@ApiTags('Admin · Fleet')
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.SERVICE_UNAVAILABLE)
@RequirePermissions(PERMISSIONS.FLEET_VIEW)
@Controller('admin/fleet')
export class FleetController {
  constructor(private readonly telematics: TelematicsClient) {}

  @Get('live')
  @ApiOperation({
    summary: 'Every bus with its live state (moving, idle, offline) and last position',
    description: 'Read from the Telematics service. 503 TELEMATICS_UNAVAILABLE when it cannot be reached.',
  })
  @ApiEnvelope(FleetLiveDto)
  live() {
    return this.telematics.get<FleetLiveDto>('/devices/live');
  }

  @Get('vehicles/:id')
  @ApiOperation({ summary: 'Live state and last position of one bus' })
  @ApiEnvelope(VehicleStatusDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  vehicle(@Param('id', ParseIntPipe) id: number) {
    return this.telematics.get<VehicleStatusDto>(`/devices/${id}/status`);
  }

  @Get('vehicles/:id/positions')
  @ApiOperation({ summary: 'Position history of one bus, newest first, for trip playback' })
  @ApiEnvelope(PositionHistoryDto, { paginated: true })
  @ApiErrors(HttpStatus.NOT_FOUND)
  positions(@Param('id', ParseIntPipe) id: number, @Query() query: PositionQueryDto) {
    return this.telematics.get<Paginated<PositionHistoryDto>>(`/devices/${id}/telemetry`, { ...query });
  }
}
