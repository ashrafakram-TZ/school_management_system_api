import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException, listQuery, Paginated } from '@app/common';
import { Device } from './entities/device.entity';
import { CreateDeviceDto } from './dto/create-device.dto';
import { DeviceQueryDto } from './dto/device-query.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class DevicesService {
  constructor(@InjectRepository(Device) private readonly devices: Repository<Device>) {}

  create(dto: CreateDeviceDto): Promise<Device> {
    return this.devices.save(this.devices.create(dto));
  }

  findAll(query: DeviceQueryDto): Promise<Paginated<Device>> {
    const qb = this.devices.createQueryBuilder('device');
    if (query.is_active !== undefined) qb.andWhere('device.is_active = :active', { active: query.is_active });
    return listQuery(qb, query, {
      searchable: ['device.name', 'device.imei', 'device.vehicle_no'],
      sortable: {
        created_at: 'device.created_at',
        name: 'device.name',
        imei: 'device.imei',
        last_seen_at: 'device.last_seen_at',
      },
      defaultSort: 'created_at',
    });
  }

  async findOne(id: number): Promise<Device> {
    const device = await this.devices.findOneBy({ id });
    if (!device) throw AppException.notFound('Device not found');
    return device;
  }

  async update(id: number, dto: UpdateDeviceDto): Promise<Device> {
    const device = await this.findOne(id);
    return this.devices.save(this.devices.merge(device, dto));
  }

  async remove(id: number): Promise<{ id: number }> {
    await this.findOne(id);
    await this.devices.softDelete(id);
    return { id };
  }
}
