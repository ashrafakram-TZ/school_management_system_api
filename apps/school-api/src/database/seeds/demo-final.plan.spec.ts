import { buildDemoStudents, cell, demoMobile, dobForGrade, freeNumbers, planWeek } from './demo-final.plan';

describe('buildDemoStudents', () => {
  const quotas = [
    { section: '1-A', grade: 1, count: 11 },
    { section: '8-B', grade: 8, count: 9 },
  ];
  const plans = buildDemoStudents(quotas, 9000001000);

  it('fills every quota with unique names and a guardian', () => {
    expect(plans).toHaveLength(20);
    const names = plans.map((plan) => `${plan.first_name} ${plan.last_name}`);
    expect(new Set(names).size).toBe(names.length);
    expect(plans.every((plan) => plan.guardians.length >= 1)).toBe(true);
    expect(new Set(plans.map((plan) => plan.gender))).toEqual(new Set(['male', 'female']));
  });

  it('gives every guardian a unique mobile in the demo range', () => {
    const mobiles = plans.flatMap((plan) => plan.guardians.map((guardian) => guardian.mobile));
    expect(new Set(mobiles).size).toBe(mobiles.length);
    expect(mobiles.every((mobile) => /^90000010\d\d$/.test(mobile))).toBe(true);
  });

  it('is deterministic', () => {
    expect(buildDemoStudents(quotas, 9000001000)).toEqual(plans);
  });

  it('dates of birth match the class age', () => {
    for (const plan of plans) {
      const age = 2026 - Number(plan.dob.slice(0, 4));
      expect(age === plan.grade + 5 || age === plan.grade + 6).toBe(true);
    }
    expect(dobForGrade(1, 0)).toBe('2020-01-01');
  });
});

describe('demo helpers', () => {
  it('rejects mobiles outside the Indian range', () => {
    expect(demoMobile(9000001000, 5)).toBe('9000001005');
    expect(() => demoMobile(9999999999, 1)).toThrow();
  });

  it('finds the lowest free roll numbers', () => {
    expect(freeNumbers([1, 2, 4, null, 99], 3)).toEqual([3, 5, 6]);
  });
});

describe('planWeek', () => {
  const days = [1, 2, 3, 4, 5, 6];

  it('schedules every period without teacher, room or section clashes', () => {
    const blocked = new Set(days.map((day) => cell(day, 1)));
    blocked.add(cell(2, 3));
    const teacherBusy = new Map([[10, new Set(days.flatMap((day) => [cell(day, 2), cell(day, 3)]))]]);
    const demands = [
      { subject_id: 1, teacher_user_id: 10, count: 7 },
      { subject_id: 2, teacher_user_id: 11, count: 6 },
      { subject_id: 3, teacher_user_id: 12, count: 6 },
      { subject_id: 4, teacher_user_id: 13, count: 5 },
      { subject_id: 5, teacher_user_id: 14, count: 5 },
      { subject_id: 6, teacher_user_id: 15, count: 3 },
      { subject_id: 7, teacher_user_id: 16, count: 2 },
    ];
    const slots = planWeek({ days, periods: 8, demands, blocked, teacherBusy });

    expect(slots).toHaveLength(34);
    const cells = slots.map((slot) => cell(slot.day_of_week, slot.period_no));
    expect(new Set(cells).size).toBe(cells.length);
    expect(cells.some((key) => blocked.has(key))).toBe(false);
    expect(
      slots
        .filter((slot) => slot.teacher_user_id === 10)
        .some((slot) => teacherBusy.get(10)!.has(cell(slot.day_of_week, slot.period_no))),
    ).toBe(false);
    for (const demand of demands) {
      const mine = slots.filter((slot) => slot.subject_id === demand.subject_id);
      expect(mine).toHaveLength(demand.count);
      for (const day of days) expect(mine.filter((slot) => slot.day_of_week === day).length).toBeLessThanOrEqual(2);
    }
  });

  it('throws when the week cannot fit', () => {
    expect(() =>
      planWeek({
        days: [1],
        periods: 2,
        demands: [{ subject_id: 1, teacher_user_id: 1, count: 3 }],
        blocked: new Set(),
        teacherBusy: new Map(),
        maxPerDay: 3,
      }),
    ).toThrow('No clash-free timetable');
  });
});
