import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessModule } from '../access/access.module';
import { AcademicYear } from '../setup/entities/academic-year.entity';
import { AssignmentsService } from './assignments.service';
import { StaffDocument } from './entities/staff-document.entity';
import { StaffQualification } from './entities/staff-qualification.entity';
import { Staff } from './entities/staff.entity';
import { TeacherAssignment } from './entities/teacher-assignment.entity';
import { StaffController, TeacherAssignmentsController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Staff, StaffQualification, StaffDocument, TeacherAssignment, AcademicYear]),
    AccessModule,
  ],
  controllers: [StaffController, TeacherAssignmentsController],
  providers: [StaffService, AssignmentsService],
  exports: [StaffService, AssignmentsService],
})
export class StaffModule {}
