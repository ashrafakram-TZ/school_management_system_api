import { Module } from '@nestjs/common';
import { StaffModule } from '../staff/staff.module';
import { StudentLifecycleModule } from '../student-lifecycle/student-lifecycle.module';
import { StudentRecordsModule } from '../student-records/student-records.module';
import { StudentsModule } from '../students/students.module';
import { MobileAccessService } from './mobile-access.service';
import { MobileParentChildController, MobileTeacherController } from './mobile.controller';

@Module({
  imports: [StudentsModule, StudentRecordsModule, StudentLifecycleModule, StaffModule],
  controllers: [MobileParentChildController, MobileTeacherController],
  providers: [MobileAccessService],
})
export class MobileModule {}
