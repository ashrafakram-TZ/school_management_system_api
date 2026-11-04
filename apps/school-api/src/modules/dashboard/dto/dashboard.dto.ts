import { ApiProperty } from '@nestjs/swagger';

export class DashboardStudentsDto {
  @ApiProperty({ example: 412, description: 'Active students' })
  total: number;

  @ApiProperty({ example: 6, description: 'Admitted since the 1st of this month' })
  joined_this_month: number;

  @ApiProperty({ example: 9, description: 'Applications in applied status for the current year' })
  applications_waiting: number;

  @ApiProperty({ example: 3, description: 'Approved applications not enrolled yet' })
  approved_not_enrolled: number;
}

export class DashboardStaffDto {
  @ApiProperty({ example: 31 })
  total: number;

  @ApiProperty({ example: 24 })
  teachers: number;

  @ApiProperty({ example: 3, description: 'Staff with missing documents or an incomplete profile' })
  need_attention: number;
}

export class StudentAttendanceTodayDto {
  @ApiProperty({ example: true, description: 'false on Sundays and holidays' })
  working_day: boolean;

  @ApiProperty({ example: 12, description: 'Sections whose attendance is marked today' })
  marked_sections: number;

  @ApiProperty({ example: 14, description: 'Sections with students' })
  total_sections: number;

  @ApiProperty({ example: 351, description: 'Present, late and half day' })
  present: number;

  @ApiProperty({ example: 18 })
  absent: number;

  @ApiProperty({ example: 4 })
  on_leave: number;

  @ApiProperty({
    example: 94.1,
    nullable: true,
    type: Number,
    description: 'Attendance % of the marked students (half day counts half), one decimal; null when nothing is marked',
  })
  percent: number | null;
}

export class StaffAttendanceTodayDto {
  @ApiProperty({ example: 31 })
  total: number;

  @ApiProperty({ example: 26, description: 'Checked in today, on time or late' })
  checked_in: number;

  @ApiProperty({ example: 2 })
  late: number;

  @ApiProperty({ example: 2, description: 'On approved leave' })
  on_leave: number;

  @ApiProperty({ example: 3, description: 'Not checked in and not on leave' })
  absent: number;

  @ApiProperty({
    example: 89.7,
    nullable: true,
    type: Number,
    description: 'checked_in / (total - on_leave), one decimal',
  })
  percent: number | null;
}

export class DashboardAttendanceDto {
  @ApiProperty({ type: StudentAttendanceTodayDto })
  students: StudentAttendanceTodayDto;

  @ApiProperty({ type: StaffAttendanceTodayDto })
  staff: StaffAttendanceTodayDto;
}

export class DashboardBusesDto {
  @ApiProperty({ example: false, description: 'false when the Telematics service could not be reached' })
  telematics_available: boolean;

  @ApiProperty({ example: 4, description: 'Active buses of the school' })
  total: number;

  @ApiProperty({ example: 4, description: 'Buses with a GPS tracker' })
  with_tracker: number;

  @ApiProperty({
    example: 3,
    nullable: true,
    type: Number,
    description: 'Trackers reporting now (moving, idle or parked)',
  })
  live: number | null;

  @ApiProperty({ example: 2, nullable: true, type: Number })
  moving: number | null;

  @ApiProperty({ example: 1, nullable: true, type: Number, description: 'total - live' })
  offline: number | null;
}

export class DashboardAlertsDto {
  @ApiProperty({ example: 2, description: 'Fleet alerts in open status' })
  open: number;

  @ApiProperty({ example: 1, description: 'SOS alerts not resolved yet' })
  sos_open: number;

  @ApiProperty({ example: 1, description: 'High severity alerts not resolved yet' })
  high_open: number;
}

export class DashboardFeesDto {
  @ApiProperty({ example: '2026-27' })
  academic_year: string;

  @ApiProperty({ example: 845000, description: 'Balance still to collect on this year’s invoices' })
  due_amount: number;

  @ApiProperty({ example: 212000, description: 'Balance past its due date' })
  overdue_amount: number;

  @ApiProperty({ example: 37, description: 'Students with an overdue balance' })
  overdue_students: number;

  @ApiProperty({ example: 18500 })
  todays_collection: number;
}

export class DashboardExamsDto {
  @ApiProperty({ example: 6, description: 'Exams this academic year' })
  total: number;

  @ApiProperty({ example: 1, description: 'Starting after today' })
  upcoming: number;

  @ApiProperty({ example: 0, description: 'Running today' })
  in_progress: number;

  @ApiProperty({ example: 4, description: 'Results published' })
  published: number;
}

export class DashboardDto {
  @ApiProperty({ example: '2026-11-04', description: 'Today in the school time zone' })
  date: string;

  @ApiProperty({ type: DashboardStudentsDto, nullable: true, description: 'null without students.view' })
  students: DashboardStudentsDto | null;

  @ApiProperty({ type: DashboardStaffDto, nullable: true, description: 'null without staff.view' })
  staff: DashboardStaffDto | null;

  @ApiProperty({ type: DashboardAttendanceDto, nullable: true, description: 'null without attendance.view' })
  attendance: DashboardAttendanceDto | null;

  @ApiProperty({ type: DashboardBusesDto, nullable: true, description: 'null without fleet.view' })
  buses: DashboardBusesDto | null;

  @ApiProperty({ type: DashboardAlertsDto, nullable: true, description: 'null without fleet.view' })
  alerts: DashboardAlertsDto | null;

  @ApiProperty({
    type: DashboardFeesDto,
    nullable: true,
    description: 'null without fees.view or with no current year',
  })
  fees: DashboardFeesDto | null;

  @ApiProperty({ type: DashboardExamsDto, nullable: true, description: 'null without exams.view' })
  exams: DashboardExamsDto | null;
}
