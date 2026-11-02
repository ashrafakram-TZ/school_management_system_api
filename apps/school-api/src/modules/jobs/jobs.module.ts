import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpRequest } from '../auth/entities/otp-request.entity';
import { UserSession } from '../auth/entities/user-session.entity';
import { CleanupJob } from './cleanup.job';

@Module({
  imports: [ScheduleModule.forRoot(), TypeOrmModule.forFeature([OtpRequest, UserSession])],
  providers: [CleanupJob],
})
export class JobsModule {}
