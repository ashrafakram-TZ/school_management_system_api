import { Global, Module } from '@nestjs/common';
import { FleetController } from './fleet.controller';
import { TelematicsClient } from './telematics.client';

@Global()
@Module({
  controllers: [FleetController],
  providers: [TelematicsClient],
  exports: [TelematicsClient],
})
export class FleetModule {}
