import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthUser } from '@app/common';
import { PERMISSIONS, ROLES } from '../access/access.catalog';
import { TransportTrip } from './entities/transport-trip.entity';

@Injectable()
export class TripAccessService {
  constructor(
    @InjectRepository(TransportTrip) private readonly trips: Repository<TransportTrip>,
    private readonly dataSource: DataSource,
  ) {}

  async canFollow(user: AuthUser, tripId: number): Promise<boolean> {
    const trip = await this.trips.findOneBy({ id: tripId });
    if (!trip) return false;
    if (user.roles.includes(ROLES.SUPER_ADMIN)) return true;
    if (user.school_id === trip.school_id && user.permissions.includes(PERMISSIONS.FLEET_VIEW)) return true;
    const [crew] = await this.dataSource.query(
      `SELECT 1 FROM vehicles WHERE id = $1 AND (driver_user_id = $2 OR attendant_user_id = $2)`,
      [trip.vehicle_id, user.id],
    );
    if (crew) return true;
    return this.isParentOnTrip(user.id, trip);
  }

  async isParentOnTrip(userId: number, trip: TransportTrip): Promise<boolean> {
    const [row] = await this.dataSource.query(
      `SELECT 1 FROM student_transport t
       JOIN student_guardians sg ON sg.student_id = t.student_id
       JOIN guardians g ON g.id = sg.guardian_id AND g.deleted_at IS NULL
       WHERE g.user_id = $1 AND t.route_id = $2 AND t.deleted_at IS NULL AND (t.mode = 'both' OR t.mode = $3)
       LIMIT 1`,
      [userId, trip.route_id, trip.kind],
    );
    return Boolean(row);
  }
}
