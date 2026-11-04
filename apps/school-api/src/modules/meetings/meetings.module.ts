import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffModule } from '../staff/staff.module';
import { AgoraTokenService } from './agora-token.service';
import { MeetingCallLog } from './entities/meeting-call-log.entity';
import { Meeting } from './entities/meeting.entity';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Meeting, MeetingCallLog]), StaffModule],
  controllers: [MeetingsController],
  providers: [MeetingsService, AgoraTokenService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
