import { Module } from '@nestjs/common';
import { AchievementsModule } from '../achievements/achievements.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { ExamsModule } from '../exams/exams.module';
import { FeesModule } from '../fees/fees.module';
import { StaffModule } from '../staff/staff.module';
import { StaffAttendanceModule } from '../staff-attendance/staff-attendance.module';
import { StaffLeaveModule } from '../staff-leave/staff-leave.module';
import { StudentLifecycleModule } from '../student-lifecycle/student-lifecycle.module';
import { StudentRecordsModule } from '../student-records/student-records.module';
import { StudentsModule } from '../students/students.module';
import { SubstitutesModule } from '../substitutes/substitutes.module';
import { TimetableModule } from '../timetable/timetable.module';
import { TrackingModule } from '../tracking/tracking.module';
import { TransportModule } from '../transport/transport.module';
import { MobileAccessService } from './mobile-access.service';
import { MobileParentAttendanceController, MobileTeacherAttendanceController } from './mobile-attendance.controller';
import { MobileParentChildController, MobileTeacherController } from './mobile.controller';
import { MobileParentAchievementsController, MobileTeacherAppController } from './mobile-teacher-app.controller';
import { BannerService } from './banner.service';
import { TeacherAppService } from './teacher-app.service';

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
    TrackingModule,
    AchievementsModule,
    ExamsModule,
    FeesModule,
  ],
  controllers: [
    MobileParentChildController,
    MobileTeacherController,
    MobileParentAttendanceController,
    MobileTeacherAttendanceController,
    MobileTeacherAppController,
    MobileParentAchievementsController,
  ],
  providers: [MobileAccessService, TeacherAppService, BannerService],
  exports: [MobileAccessService],
})
export class MobileModule {}
