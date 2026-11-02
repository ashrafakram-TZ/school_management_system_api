import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@app/common';
import { HealthService } from './health.service';

@ApiTags('Health')
@Public()
@Controller({ path: 'health', version: [VERSION_NEUTRAL, '1'] })
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Database and Telematics service status. Available at /api/health and /api/v1/health.' })
  check() {
    return this.healthService.check();
  }
}
