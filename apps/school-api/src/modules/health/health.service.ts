import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TelematicsClient } from '../fleet/telematics.client';

export interface HealthStatus {
  db: 'up' | 'down';
  telematics: 'up' | 'down';
}

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly telematics: TelematicsClient,
  ) {}

  async check(): Promise<HealthStatus> {
    const [db, telematics] = await Promise.all([this.database(), this.telematics.reachable()]);
    return { db, telematics: telematics ? 'up' : 'down' };
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
