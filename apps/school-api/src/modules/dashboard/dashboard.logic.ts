import { percent } from '../../shared/school-days';
import { PERMISSIONS } from '../access/access.catalog';

export const DASHBOARD_SECTIONS = ['students', 'staff', 'attendance', 'buses', 'alerts', 'fees', 'exams'] as const;
export type DashboardSection = (typeof DASHBOARD_SECTIONS)[number];

const SECTION_PERMISSION: Record<DashboardSection, string> = {
  students: PERMISSIONS.STUDENTS_VIEW,
  staff: PERMISSIONS.STAFF_VIEW,
  attendance: PERMISSIONS.ATTENDANCE_VIEW,
  buses: PERMISSIONS.FLEET_VIEW,
  alerts: PERMISSIONS.FLEET_VIEW,
  fees: PERMISSIONS.FEES_VIEW,
  exams: PERMISSIONS.EXAMS_VIEW,
};

export function visibleSections(permissions: string[]): Record<DashboardSection, boolean> {
  return Object.fromEntries(
    DASHBOARD_SECTIONS.map((section) => [section, permissions.includes(SECTION_PERMISSION[section])]),
  ) as Record<DashboardSection, boolean>;
}

export function whenAllowed<T>(allowed: boolean, load: () => Promise<T>): Promise<T | null> {
  return allowed ? load() : Promise.resolve(null);
}

export interface StudentBoardSummary {
  working_day: boolean;
  sections_total: number;
  sections_not_marked: number;
  summary: { present: number; late: number; half_day: number; absent: number; leave: number; percent: number | null };
}

export function studentsToday(board: StudentBoardSummary) {
  const { summary } = board;
  return {
    working_day: board.working_day,
    marked_sections: board.sections_total - board.sections_not_marked,
    total_sections: board.sections_total,
    present: summary.present + summary.late + summary.half_day,
    absent: summary.absent,
    on_leave: summary.leave,
    percent: summary.percent,
  };
}

export interface StaffBoardSummary {
  total: number;
  present: number;
  late: number;
  on_leave: number;
  not_checked_in: number;
}

export function staffToday(board: StaffBoardSummary) {
  const checkedIn = board.present + board.late;
  return {
    total: board.total,
    checked_in: checkedIn,
    late: board.late,
    on_leave: board.on_leave,
    absent: board.not_checked_in,
    percent: percent(checkedIn, board.total - board.on_leave),
  };
}

export const LIVE_STATES = ['moving', 'idle', 'parked'];

export function busCounts(deviceIds: (number | null)[], live: { vehicles: { id: number; state: string }[] } | null) {
  const total = deviceIds.length;
  const withTracker = deviceIds.filter((id): id is number => id !== null);
  if (!live) {
    return {
      telematics_available: false,
      total,
      with_tracker: withTracker.length,
      live: null,
      moving: null,
      offline: null,
    };
  }
  const states = new Map(live.vehicles.map((vehicle) => [vehicle.id, vehicle.state]));
  const tracked = withTracker.map((id) => states.get(id));
  const liveCount = tracked.filter((state) => state !== undefined && LIVE_STATES.includes(state)).length;
  return {
    telematics_available: true,
    total,
    with_tracker: withTracker.length,
    live: liveCount,
    moving: tracked.filter((state) => state === 'moving').length,
    offline: total - liveCount,
  };
}
