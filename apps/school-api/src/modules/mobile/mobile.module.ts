import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { StaffModule } from '../staff/staff.module';
import { StaffAttendanceModule } from '../staff-attendance/staff-attendance.module';
import { StaffLeaveModule } from '../staff-leave/staff-leave.module';
import { StudentLifecycleModule } from '../student-lifecycle/student-lifecycle.module';
import { StudentRecordsModule } from '../student-records/student-records.module';
import { StudentsModule } from '../students/students.module';
import { SubstitutesModule } from '../substitutes/substitutes.module';
import { TimetableModule } from '../timetable/timetable.module';
import { TransportModule } from '../transport/transport.module';
import { MobileAccessService } from './mobile-access.service';
import { MobileParentAttendanceController, MobileTeacherAttendanceController } from './mobile-attendance.controller';
import { MobileParentChildController, MobileTeacherController } from './mobile.controller';

@Module({
  imports: [
    StudentsModule,
    StudentRecordsModule,
    StudentLifecycleModule,
    StaffModule,
    AttendanceModule,
    StaffAttendanceModule,
    StaffLeaveModule,
    TimetableModule,
    SubstitutesModule,
    TransportModule,
  ],
  controllers: [
    MobileParentChildController,
    MobileTeacherController,
    MobileParentAttendanceController,
    MobileTeacherAttendanceController,
  ],
  providers: [MobileAccessService],
})
export class MobileModule {}
