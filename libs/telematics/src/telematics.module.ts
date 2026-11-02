import { Module } from '@nestjs/common';
import { DevicesModule } from './devices/devices.module';
import { MqttModule } from './mqtt/mqtt.module';
import { TelemetryModule } from './telemetry/telemetry.module';

@Module({
  imports: [MqttModule, DevicesModule, TelemetryModule],
  exports: [MqttModule, DevicesModule],
})
export class TelematicsModule {}
