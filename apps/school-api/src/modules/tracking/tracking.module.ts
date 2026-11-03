import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { TransportTrip } from './entities/transport-trip.entity';
import { TripBoarding } from './entities/trip-boarding.entity';
import { TripEvent } from './entities/trip-event.entity';
import { LiveGateway } from './live.gateway';
import { TripAccessService } from './trip-access.service';
import { TripEventsService } from './trip-events.service';
import { AdminTripsController, DriverTripsController, TelematicsWebhookController } from './tracking.controller';
import { TripsService } from './trips.service';

@Module({
  imports: [TypeOrmModule.forFeature([TransportTrip, TripEvent, TripBoarding]), AuthModule],
  controllers: [AdminTripsController, DriverTripsController, TelematicsWebhookController],
  providers: [TripsService, TripEventsService, TripAccessService, LiveGateway],
  exports: [TripsService, TripAccessService, LiveGateway],
})
export class TrackingModule {}
