import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffAttendance } from './entities/staff-attendance.entity';
import { BiometricController, StaffAttendanceController } from './staff-attendance.controller';
import { StaffAttendanceService } from './staff-attendance.service';

@Module({
  imports: [TypeOrmModule.forFeature([StaffAttendance])],
  controllers: [StaffAttendanceController, BiometricController],
  providers: [StaffAttendanceService],
  exports: [StaffAttendanceService],
})
export class StaffAttendanceModule {}
