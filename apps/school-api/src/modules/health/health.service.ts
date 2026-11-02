import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MqttState, MqttStatusService } from '@app/telematics';

export interface HealthStatus {
  db: 'up' | 'down';
  mqtt: MqttState;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly mqttStatus: MqttStatusService,
  ) {}

  async check(): Promise<HealthStatus> {
    return { db: await this.database(), mqtt: this.mqttStatus.status() };
  }

  private async database(): Promise<'up' | 'down'> {
    try {
      await this.dataSource.query('SELECT 1');
      return 'up';
    } catch {
      return 'down';
    }
  }
}
