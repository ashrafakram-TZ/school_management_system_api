import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffModule } from '../staff/staff.module';
import { ExamMark } from './entities/exam-mark.entity';
import { ExamSubject } from './entities/exam-subject.entity';
import { Exam } from './entities/exam.entity';
import { ExamsController, StudentResultsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { MobileParentExamsController, MobileTeacherExamsController } from './mobile-exams.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Exam, ExamSubject, ExamMark]), StaffModule],
  controllers: [ExamsController, StudentResultsController, MobileTeacherExamsController, MobileParentExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}
