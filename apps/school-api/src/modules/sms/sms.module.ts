import { Global, Module } from '@nestjs/common';
import { KafkaNotifyService } from './kafka-notify.service';
import { SmsService } from './sms.service';

@Global()
@Module({
  providers: [SmsService, KafkaNotifyService],
  exports: [SmsService, KafkaNotifyService],
})
export class SmsModule {}
