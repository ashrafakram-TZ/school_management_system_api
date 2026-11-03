import { ApiProperty } from '@nestjs/swagger';
import { AchievementDto } from '../../achievements/dto/achievement.dto';
import { StudentExamResultDto } from '../../exams/dto/exams.dto';
import { FeeStatusDto, StudentFeesDto } from '../../fees/dto/fees.dto';
import { MonthlyAttendanceDto, StudentLeaveDto } from '../../attendance/dto/attendance.dto';
import { DigitalIdDto } from '../../student-lifecycle/dto/lifecycle.dto';
import { BehaviourNoteDto, HealthDto, StudentDocumentDto } from '../../student-records/dto/records.dto';
import { RefDto, StudentDetailDto, StudentListItemDto } from '../../students/dto/student-response.dto';
import { SlotSubjectDto } from '../../timetable/dto/timetable.dto';

export class TodayPeriodDto {
  @ApiProperty({ example: 1, nullable: true, type: Number, description: 'null for breaks' })
  period_no: number | null;

  @ApiProperty({ example: 'Period 1' })
  name: string;

  @ApiProperty({ example: '08:50' })
  start_time: string;

  @ApiProperty({ example: '09:35' })
  end_time: string;

  @ApiProperty()
  is_break: boolean;

  @ApiProperty({
    enum: ['class', 'substitute', 'free', 'break'],
    description: 'class: my own period; substitute: covering for an absent teacher',
  })
  kind: 'class' | 'substitute' | 'free' | 'break';

  @ApiProperty({ type: RefDto, nullable: true, description: 'Section, e.g. 12 - A. Tap it to open the student list.' })
  section: RefDto | null;

  @ApiProperty({ type: SlotSubjectDto, nullable: true })
  subject: SlotSubjectDto | null;

  @ApiProperty({ nullable: true, type: String })
  room: string | null;

  @ApiProperty({ example: 38, description: 'Students in the section' })
  students: number;

  @ApiProperty({
    example: 36,
    nullable: true,
    type: Number,
    description: 'Present today, once the morning attendance is marked',
  })
  present: number | null;

  @ApiProperty({ description: 'Morning attendance of the section is marked today' })
  attendance_marked: boolean;

  @ApiProperty({ description: 'This period is happening now' })
  is_now: boolean;
}

export class TodayTimetableDto {
  @ApiProperty({ example: '2026-11-04' })
  date: string;

  @ApiProperty({ example: 3, description: '1 Monday … 6 Saturday, 0 Sunday' })
  day_of_week: number;

  @ApiProperty({ example: 'Wednesday' })
  day_name: string;

  @ApiProperty()
  working_day: boolean;

  @ApiProperty({ nullable: true, type: String })
  holiday: string | null;

  @ApiProperty({ example: 5, description: 'Periods I teach today, including substitutions' })
  my_periods: number;

  @ApiProperty({ type: [TodayPeriodDto], description: 'Whole school day in bell order, breaks included' })
  periods: TodayPeriodDto[];
}

export class YearAttendanceDto {
  @ApiProperty({ example: 92.4, nullable: true, type: Number })
  percent: number | null;

  @ApiProperty({ example: 110 })
  days_marked: number;

  @ApiProperty({ example: 101 })
  present: number;

  @ApiProperty({ example: 6 })
  absent: number;

  @ApiProperty({ example: 2 })
  late: number;

  @ApiProperty({ example: 1 })
  leave: number;
}

export class StudentHistoryDto {
  @ApiProperty({ type: StudentDetailDto, description: 'Profile, class, roll number and parents with mobile numbers' })
  student: StudentDetailDto;

  @ApiProperty({ type: YearAttendanceDto, description: 'This academic year' })
  attendance_year: YearAttendanceDto;

  @ApiProperty({ type: MonthlyAttendanceDto, description: 'This month, day by day' })
  attendance_month: MonthlyAttendanceDto;

  @ApiProperty({ type: [StudentLeaveDto] })
  leaves: StudentLeaveDto[];

  @ApiProperty({ type: [BehaviourNoteDto], description: 'Remarks and discipline notes' })
  behaviour: BehaviourNoteDto[];

  @ApiProperty({ type: [AchievementDto] })
  achievements: AchievementDto[];

  @ApiProperty({
    type: [StudentExamResultDto],
    description: 'Published exam results, newest first, with section and class rank',
  })
  results: StudentExamResultDto[];

  @ApiProperty({
    type: StudentFeesDto,
    nullable: true,
    description: 'Fee summary; only for the class teacher of the student’s section',
  })
  fees: StudentFeesDto | null;

  @ApiProperty({ type: HealthDto })
  health: HealthDto;

  @ApiProperty({ type: [StudentDocumentDto] })
  documents: StudentDocumentDto[];

  @ApiProperty({ type: DigitalIdDto, nullable: true, description: 'ID card details' })
  id_card: DigitalIdDto | null;
}

export class RosterStudentDto extends StudentListItemDto {
  @ApiProperty({
    type: FeeStatusDto,
    nullable: true,
    description: 'Fee status; only for the class teacher of the section',
  })
  fee: FeeStatusDto | null;
}
