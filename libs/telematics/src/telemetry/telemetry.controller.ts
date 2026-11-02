import { Controller, Get, HttpStatus, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, RequirePermissions } from '@app/common';
import { FLEET_PERMISSIONS } from '../telematics.permissions';
import { TelemetryQueryDto } from './dto/telemetry-query.dto';
import { Telemetry } from './entities/telemetry.entity';
import { TelemetryService } from './telemetry.service';

@ApiTags('Fleet · Telemetry')
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
@RequirePermissions(FLEET_PERMISSIONS.VIEW)
@Controller('fleet/devices/:id/telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Get('latest')
  @ApiOperation({ summary: 'Latest position of a device' })
  @ApiEnvelope(Telemetry)
  latest(@Param('id', ParseIntPipe) id: number) {
    return this.telemetryService.latest(id);
  }

  @Get()
  @ApiOperation({ summary: 'Position history of a device, newest first' })
  @ApiEnvelope(Telemetry, { paginated: true })
  history(@Param('id', ParseIntPipe) id: number, @Query() query: TelemetryQueryDto) {
    return this.telemetryService.history(id, query);
  }
}
