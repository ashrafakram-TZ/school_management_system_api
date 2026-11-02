import { Module } from '@nestjs/common';
import { StudentsModule } from '../students/students.module';
import { StudentImportController } from './student-import.controller';
import { StudentImportService } from './student-import.service';

@Module({
  imports: [StudentsModule],
  controllers: [StudentImportController],
  providers: [StudentImportService],
})
export class StudentImportModule {}
