import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransportTrip } from '../tracking/entities/transport-trip.entity';
import { TrackingModule } from '../tracking/tracking.module';
import { Vehicle } from '../transport/entities/vehicle.entity';
import { FuelLog } from './entities/fuel-log.entity';
import { MaintenanceTicket } from './entities/maintenance-ticket.entity';
import { FleetHealthService } from './fleet-health.service';
import { FleetHealthController, FuelController, MaintenanceController } from './fleet-ops.controller';
import { FuelService } from './fuel.service';
import { MaintenanceService } from './maintenance.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([MaintenanceTicket, FuelLog, Vehicle, TransportTrip]), TrackingModule],
  controllers: [MaintenanceController, FuelController, FleetHealthController],
  providers: [MaintenanceService, FuelService, FleetHealthService],
  exports: [MaintenanceService],
})
export class FleetOpsModule {}
