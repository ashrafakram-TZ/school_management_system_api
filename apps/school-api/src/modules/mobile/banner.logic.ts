import { BannerDto, BannerSeverity } from './dto/banner.dto';

export interface TeacherDayFacts {
  holiday: string | null;
  sunday: boolean;
  leaveType: string | null;
  checkedIn: boolean;
  reportingTime: string;
  now: string;
  proxies: { period_no: number; section: string; subject: string; start_time: string }[];
  combined: { period_no: number; from: string; group: string; section: string; start_time: string }[];
  unmarkedSections: { id: number; name: string }[];
  pendingLeaves: number;
  staffApprovals: number;
  unread: number;
}

const ORDER: Record<BannerSeverity, number> = { critical: 0, warning: 1, info: 2 };

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function teacherBanners(facts: TeacherDayFacts): BannerDto[] {
  const banners: BannerDto[] = [];
  const offDay = facts.sunday || Boolean(facts.holiday);
  if (offDay) {
    banners.push({
      code: 'HOLIDAY_TODAY',
      severity: 'info',
      title: facts.holiday ? `Holiday: ${facts.holiday}` : 'No school today',
      message: facts.holiday ? 'There are no classes today.' : 'Sunday. There are no classes today.',
      action: { screen: 'home' },
    });
  } else if (facts.leaveType) {
    banners.push({
      code: 'ON_LEAVE_TODAY',
      severity: 'info',
      title: `You are on ${facts.leaveType.toLowerCase()} today`,
      message: 'Your periods are covered by a proxy or a combined class.',
      action: { screen: 'timetable' },
    });
  } else {
    if (!facts.checkedIn) {
      const late = facts.now >= facts.reportingTime;
      banners.push({
        code: 'CHECK_IN_PENDING',
        severity: late ? 'warning' : 'info',
        title: late ? 'You have not checked in' : 'Check in when you reach school',
        message: late
          ? `Reporting time was ${facts.reportingTime}. Check in from inside the school.`
          : `Reporting time is ${facts.reportingTime}.`,
        action: { screen: 'check_in' },
      });
    }
    for (const section of facts.unmarkedSections) {
      banners.push({
        code: 'ATTENDANCE_NOT_MARKED',
        severity: 'warning',
        title: 'Attendance not marked',
        message: `${section.name} has no attendance for today yet.`,
        action: { screen: 'attendance', params: { section_id: section.id } },
      });
    }
    if (facts.proxies.length) {
      banners.push({
        code: 'PROXY_TODAY',
        severity: 'info',
        title: facts.proxies.length === 1 ? 'Proxy period today' : `${facts.proxies.length} proxy periods today`,
        message: facts.proxies
          .map((item) => `P${item.period_no} ${item.start_time} · ${item.section} ${item.subject}`)
          .join(', '),
        count: facts.proxies.length,
        action: { screen: 'timetable' },
      });
    }
    for (const item of facts.combined) {
      banners.push({
        code: 'COMBINED_CLASS_TODAY',
        severity: 'info',
        title: `${item.from} joins your class`,
        message: `In P${item.period_no} (${item.start_time}), ${item.group} of ${item.from} sit with ${item.section}.`,
        action: { screen: 'timetable' },
      });
    }
  }
  if (facts.pendingLeaves) {
    banners.push({
      code: 'LEAVE_REQUESTS_PENDING',
      severity: 'info',
      title: 'Leave requests to review',
      message: `${plural(facts.pendingLeaves, 'request', 'requests')} from parents waiting for you.`,
      count: facts.pendingLeaves,
      action: { screen: 'student_leaves' },
    });
  }
  if (facts.staffApprovals) {
    banners.push({
      code: 'STAFF_LEAVE_APPROVALS',
      severity: 'info',
      title: 'Staff leave to approve',
      message: `${plural(facts.staffApprovals, 'staff leave request', 'staff leave requests')} waiting for your decision.`,
      count: facts.staffApprovals,
      action: { screen: 'staff_leave_approvals' },
    });
  }
  if (facts.unread) {
    banners.push({
      code: 'UNREAD_ALERTS',
      severity: 'info',
      title: 'Unread notifications',
      message: `You have ${plural(facts.unread, 'unread notification', 'unread notifications')}.`,
      count: facts.unread,
      action: { screen: 'notifications' },
    });
  }
  return banners.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}

export interface SchoolBannerSource {
  title: string;
  message: string | null;
  link_url: string | null;
  image: { url: string; thumbnail_url: string | null } | null;
}

export function schoolBanners(rows: SchoolBannerSource[]): BannerDto[] {
  return rows.map((row) => ({
    code: 'SCHOOL_BANNER',
    severity: 'info',
    title: row.title,
    message: row.message ?? '',
    action: row.link_url ? { screen: 'link', params: { url: row.link_url } } : { screen: 'home' },
    image_url: row.image?.url ?? null,
    thumbnail_url: row.image?.thumbnail_url ?? null,
  }));
}
