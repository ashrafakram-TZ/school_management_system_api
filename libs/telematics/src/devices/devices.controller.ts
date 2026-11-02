import { Body, Controller, Delete, Get, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, RequirePermissions, ResponseMessage } from '@app/common';
import { FLEET_PERMISSIONS } from '../telematics.permissions';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { DeviceQueryDto } from './dto/device-query.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { Device } from './entities/device.entity';

@ApiTags('Fleet · Devices')
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
@Controller('fleet/devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @RequirePermissions(FLEET_PERMISSIONS.MANAGE)
  @ResponseMessage('Device created')
  @ApiOperation({ summary: 'Register a tracker device' })
  @ApiEnvelope(Device, { status: HttpStatus.CREATED, message: 'Device created' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  create(@Body() dto: CreateDeviceDto) {
    return this.devicesService.create(dto);
  }

  @Get()
  @RequirePermissions(FLEET_PERMISSIONS.VIEW)
  @ApiOperation({
    summary: 'List devices',
    description: 'search matches name, IMEI and vehicle number. sort: created_at, name, imei, last_seen_at',
  })
  @ApiEnvelope(Device, { paginated: true })
  findAll(@Query() query: DeviceQueryDto) {
    return this.devicesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(FLEET_PERMISSIONS.VIEW)
  @ApiOperation({ summary: 'Get one device' })
  @ApiEnvelope(Device)
  @ApiErrors(HttpStatus.NOT_FOUND)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.devicesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(FLEET_PERMISSIONS.MANAGE)
  @ResponseMessage('Device updated')
  @ApiOperation({ summary: 'Update a device' })
  @ApiEnvelope(Device, { message: 'Device updated' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDeviceDto) {
    return this.devicesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(FLEET_PERMISSIONS.MANAGE)
  @ResponseMessage('Device deleted')
  @ApiOperation({ summary: 'Remove a device' })
  @ApiErrors(HttpStatus.NOT_FOUND)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.devicesService.remove(id);
  }
}
