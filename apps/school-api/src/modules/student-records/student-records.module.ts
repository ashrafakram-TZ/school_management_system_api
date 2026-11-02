import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from '../students/entities/student.entity';
import { User } from '../users/entities/user.entity';
import { BehaviourNote } from './entities/behaviour-note.entity';
import { StudentDocument } from './entities/student-document.entity';
import { StudentHealth } from './entities/student-health.entity';
import { Vaccination } from './entities/vaccination.entity';
import { StudentRecordsController } from './student-records.controller';
import { StudentRecordsService } from './student-records.service';

@Module({
  imports: [TypeOrmModule.forFeature([Student, StudentDocument, StudentHealth, Vaccination, BehaviourNote, User])],
  controllers: [StudentRecordsController],
  providers: [StudentRecordsService],
  exports: [StudentRecordsService],
})
export class StudentRecordsModule {}
