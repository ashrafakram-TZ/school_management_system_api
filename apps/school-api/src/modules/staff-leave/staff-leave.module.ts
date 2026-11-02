import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveType } from './entities/leave-type.entity';
import { StaffLeave } from './entities/staff-leave.entity';
import { StaffLeaveController } from './staff-leave.controller';
import { StaffLeaveService } from './staff-leave.service';

@Module({
  imports: [TypeOrmModule.forFeature([LeaveType, StaffLeave])],
  controllers: [StaffLeaveController],
  providers: [StaffLeaveService],
  exports: [StaffLeaveService],
})
export class StaffLeaveModule {}
