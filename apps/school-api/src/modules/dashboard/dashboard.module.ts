import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { FeesModule } from '../fees/fees.module';
import { StaffModule } from '../staff/staff.module';
import { StaffAttendanceModule } from '../staff-attendance/staff-attendance.module';
import { StudentsModule } from '../students/students.module';
import { TrackingModule } from '../tracking/tracking.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [StudentsModule, StaffModule, AttendanceModule, StaffAttendanceModule, FeesModule, TrackingModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
