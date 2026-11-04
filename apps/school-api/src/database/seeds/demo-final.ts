import { EntityManager, In, IsNull, Not } from 'typeorm';
import { ROLES, roleConflict } from '../../modules/access/access.catalog';
import { Role } from '../../modules/access/entities/role.entity';
import { SalaryStructure } from '../../modules/payroll/entities/salary-structure.entity';
import { School } from '../../modules/schools/entities/school.entity';
import { SequencesService } from '../../modules/schools/sequences.service';
import { FieldCipher, lastDigits } from '../../modules/security/field-cipher';
import { AcademicYear } from '../../modules/setup/entities/academic-year.entity';
import { ClassSubject } from '../../modules/setup/entities/class-subject.entity';
import { SchoolClass } from '../../modules/setup/entities/school-class.entity';
import { Section } from '../../modules/setup/entities/section.entity';
import { Subject } from '../../modules/setup/entities/subject.entity';
import { StaffQualification } from '../../modules/staff/entities/staff-qualification.entity';
import { Staff } from '../../modules/staff/entities/staff.entity';
import { TeacherAssignment } from '../../modules/staff/entities/teacher-assignment.entity';
import { Guardian } from '../../modules/students/entities/guardian.entity';
import { StudentEnrollment } from '../../modules/students/entities/student-enrollment.entity';
import { StudentGuardian } from '../../modules/students/entities/student-guardian.entity';
import { Student } from '../../modules/students/entities/student.entity';
import { TimetableSlot } from '../../modules/timetable/entities/timetable-slot.entity';
import { SCHOOL_DAYS } from '../../modules/timetable/timetable.service';
import { RouteStop } from '../../modules/transport/entities/route-stop.entity';
import { StudentTransport } from '../../modules/transport/entities/student-transport.entity';
import { TransportRoute } from '../../modules/transport/entities/transport-route.entity';
import { Vehicle } from '../../modules/transport/entities/vehicle.entity';
import { passengerRef } from '../../modules/transport/routes.service';
import { UserRole } from '../../modules/users/entities/user-role.entity';
import { User } from '../../modules/users/entities/user.entity';
import {
  FINAL_ASSIGNMENTS,
  FINAL_CLASS_TEACHERS,
  FINAL_CREW,
  FINAL_TEACHERS,
  FinalStaff,
  GUARDIAN_MOBILE_BASE,
  MIDDLE_PERIODS,
  PRIMARY_SUBJECTS,
  RIDER_QUOTAS,
  STUDENT_QUOTAS,
  TEACHING_TARGET,
  THIRD_ROUTE,
  TIMETABLE_SECTIONS,
} from './demo-final.data';
import { buildDemoStudents, cell, DemoGuardianPlan, freeNumbers, planWeek } from './demo-final.plan';
import { SALARY_BY_DESIGNATION } from './demo-day5';

const BUS_TWO = 'TN 09 CD 5678';
const STREETS = ['Gandhi Street', 'Nehru Nagar', 'Anna Salai', 'Kamarajar Road', 'Periyar Street', 'Bharathi Salai'];

interface Counts {
  staff: number;
  salaries: number;
  class_subjects: number;
  assignments: number;
  class_teachers: number;
  students: number;
  guardians: number;
  riders: number;
  slots: number;
  route: string;
  crew: string;
}

type SectionMap = Map<string, Section & { class_name: string }>;

async function roleIds(manager: EntityManager): Promise<Map<string, number>> {
  return new Map((await manager.find(Role)).map((role) => [role.code, role.id]));
}

async function activeTeaching(manager: EntityManager, schoolId: number): Promise<number> {
  return manager.count(Staff, {
    where: { school_id: schoolId, staff_type: 'teaching', status: Not('resigned') },
  });
}

async function nextEmployeeNo(manager: EntityManager, school: School, sequences: SequencesService): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const value = await sequences.next(manager, school.id, 'employee');
    const candidate = `${school.code}-EMP-${String(value).padStart(4, '0')}`;
    if (!(await manager.exists(Staff, { where: { school_id: school.id, employee_no: candidate } }))) return candidate;
  }
  throw new Error('Could not generate an employee number');
}

async function ensurePerson(
  manager: EntityManager,
  school: School,
  person: FinalStaff,
  roles: Map<string, number>,
): Promise<User> {
  let user = await manager.findOneBy(User, { mobile: person.mobile, deleted_at: IsNull() });
  if (user && user.school_id !== school.id) throw new Error(`${person.mobile} belongs to another school`);
  if (!user) {
    user = await manager.save(
      manager.create(User, {
        school_id: school.id,
        name: person.name,
        mobile: person.mobile,
        status: 'active',
        language: person.type === 'teaching' ? 'en' : 'ta',
      }),
    );
  }
  const current: { code: string }[] = await manager.query(
    `SELECT r.code FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1`,
    [user.id],
  );
  const conflict = roleConflict([...current.map((row) => row.code), ...person.roles]);
  if (conflict) throw new Error(`${person.name}: ${conflict}`);
  for (const code of person.roles) {
    await manager
      .createQueryBuilder()
      .insert()
      .into(UserRole)
      .values({ user_id: user.id, role_id: roles.get(code)! })
      .orIgnore()
      .execute();
  }
  return user;
}

async function ensureStaff(
  manager: EntityManager,
  school: School,
  person: FinalStaff,
  user: User,
  index: number,
  cipher: FieldCipher,
  sequences: SequencesService,
): Promise<boolean> {
  if (await manager.exists(Staff, { where: { user_id: user.id } })) return false;
  const staff = await manager.save(
    manager.create(Staff, {
      school_id: school.id,
      user_id: user.id,
      employee_no: await nextEmployeeNo(manager, school, sequences),
      staff_type: person.type,
      designation: person.designation,
      department: person.department,
      gender: person.gender,
      dob: `${1978 + (index % 16)}-${String((index % 12) + 1).padStart(2, '0')}-${String(((index * 3) % 27) + 1).padStart(2, '0')}`,
      joining_date: person.joined,
      prior_experience_years: person.prior,
      max_periods_per_week: person.type === 'teaching' ? 30 : 0,
      address: `${index + 11}, ${STREETS[index % STREETS.length]}, Chennai`,
      emergency_contact_name: 'Family contact',
      emergency_contact_mobile: `98410${String(20000 + index * 41).slice(0, 5)}`,
      status: 'active',
      licence_no: person.licence?.[0] ?? null,
      licence_expiry: person.licence?.[1] ?? null,
      ...(person.bank
        ? {
            bank_account_holder: person.name,
            bank_name: person.bank[0],
            bank_ifsc: person.bank[1],
            bank_account_enc: cipher.encrypt(person.bank[2]),
            bank_account_last4: lastDigits(person.bank[2]),
          }
        : {}),
    }),
  );
  await manager.insert(
    StaffQualification,
    person.degrees.map(([degree, specialization, completed]) => ({
      staff_id: staff.id,
      degree,
      specialization,
      institution: ['Madras University', 'Annamalai University', 'Bharathidasan University', 'Alagappa University'][
        index % 4
      ],
      year_completed: completed,
    })),
  );
  return true;
}

async function ensureSalary(
  manager: EntityManager,
  schoolId: number,
  year: AcademicYear,
  person: FinalStaff,
  user: User,
) {
  const scale = SALARY_BY_DESIGNATION[person.designation];
  if (!scale) return false;
  if (await manager.exists(SalaryStructure, { where: { user_id: user.id } })) return false;
  const [basic, special, esi] = scale;
  await manager.save(
    manager.create(SalaryStructure, {
      school_id: schoolId,
      user_id: user.id,
      effective_from: year.start_date,
      basic,
      da: Math.round(basic * 0.1),
      hra: Math.round(basic * 0.4),
      conveyance: 1600,
      special_allowance: special,
      other_allowance: 0,
      pf_enabled: true,
      esi_enabled: esi,
      professional_tax: basic >= 21000 ? 208 : basic >= 15000 ? 125 : 0,
      tds: 0,
      other_deduction: 0,
    }),
  );
  return true;
}

async function seedPeople(
  manager: EntityManager,
  school: School,
  year: AcademicYear,
  counts: Counts,
): Promise<Map<string, number>> {
  const key = process.env.DATA_ENCRYPTION_KEY;
  if (!key) throw new Error('DATA_ENCRYPTION_KEY is missing in .env');
  const cipher = new FieldCipher(key);
  const sequences = new SequencesService();
  const roles = await roleIds(manager);
  const userIds = new Map<string, number>();
  const people = [...FINAL_TEACHERS, ...FINAL_CREW];
  for (const [index, person] of people.entries()) {
    const existing = await manager.findOneBy(User, { mobile: person.mobile, deleted_at: IsNull() });
    const onStaff = existing ? await manager.exists(Staff, { where: { user_id: existing.id } }) : false;
    if (person.reserve && !onStaff && (await activeTeaching(manager, school.id)) >= TEACHING_TARGET) continue;
    const user = await ensurePerson(manager, school, person, roles);
    userIds.set(person.mobile, user.id);
    if (await ensureStaff(manager, school, person, user, index, cipher, sequences)) counts.staff += 1;
    if (await ensureSalary(manager, school.id, year, person, user)) counts.salaries += 1;
  }
  const known: { id: number; mobile: string }[] = await manager.query(
    `SELECT id, mobile FROM users WHERE school_id = $1 AND deleted_at IS NULL AND mobile LIKE '9000000%'`,
    [school.id],
  );
  for (const row of known) if (!userIds.has(row.mobile)) userIds.set(row.mobile, Number(row.id));
  return userIds;
}

async function loadSections(manager: EntityManager, schoolId: number, yearId: number): Promise<SectionMap> {
  const sections = await manager.find(Section, {
    where: { school_id: schoolId, academic_year_id: yearId },
    relations: { school_class: true },
  });
  return new Map(
    sections.map((section) => [
      `${section.school_class?.name}-${section.name}`,
      Object.assign(section, { class_name: section.school_class?.name ?? '' }),
    ]),
  );
}

async function seedCurriculum(
  manager: EntityManager,
  schoolId: number,
  year: AcademicYear,
  sections: SectionMap,
  userIds: Map<string, number>,
  counts: Counts,
): Promise<void> {
  const subjects = new Map(
    (await manager.findBy(Subject, { school_id: schoolId })).map((subject) => [subject.code, subject]),
  );
  for (const className of ['1', '2', '3', '4', '5']) {
    const schoolClass = await manager.findOneBy(SchoolClass, { school_id: schoolId, name: className });
    if (!schoolClass) continue;
    for (const [code, periods] of PRIMARY_SUBJECTS) {
      const subject = subjects.get(code);
      if (!subject) continue;
      const result = await manager
        .createQueryBuilder()
        .insert()
        .into(ClassSubject)
        .values({
          school_id: schoolId,
          class_id: schoolClass.id,
          subject_id: subject.id,
          academic_year_id: year.id,
          periods_per_week: periods,
          is_optional: false,
        })
        .orIgnore()
        .execute();
      counts.class_subjects += (result.raw as unknown[]).length;
    }
  }

  const teaching = new Set(
    (
      await manager.find(Staff, {
        where: { school_id: schoolId, staff_type: 'teaching', status: Not('resigned') },
      })
    ).map((row) => row.user_id),
  );
  for (const [sectionKey, plan] of Object.entries(FINAL_ASSIGNMENTS)) {
    const section = sections.get(sectionKey);
    if (!section) continue;
    for (const [code, mobile] of Object.entries(plan)) {
      const subject = subjects.get(code);
      const teacher = userIds.get(mobile);
      if (!subject || !teacher || !teaching.has(teacher)) continue;
      if (await manager.exists(TeacherAssignment, { where: { section_id: section.id, subject_id: subject.id } })) {
        continue;
      }
      const required = await manager.findOneBy(ClassSubject, {
        class_id: section.class_id,
        subject_id: subject.id,
        academic_year_id: year.id,
      });
      await manager.insert(TeacherAssignment, {
        school_id: schoolId,
        academic_year_id: year.id,
        section_id: section.id,
        subject_id: subject.id,
        teacher_user_id: teacher,
        periods_per_week: required?.periods_per_week ?? MIDDLE_PERIODS[code] ?? 5,
      });
      counts.assignments += 1;
    }
  }

  for (const [sectionKey, mobile] of Object.entries(FINAL_CLASS_TEACHERS)) {
    const section = sections.get(sectionKey);
    const teacher = userIds.get(mobile);
    if (!section || !teacher || !teaching.has(teacher) || section.class_teacher_user_id) continue;
    await manager.update(Section, section.id, { class_teacher_user_id: teacher });
    section.class_teacher_user_id = teacher;
    counts.class_teachers += 1;
  }
}

async function ensureGuardian(
  manager: EntityManager,
  schoolId: number,
  plan: DemoGuardianPlan,
  parentRoleId: number,
  counts: Counts,
): Promise<Guardian> {
  let user = await manager.findOneBy(User, { mobile: plan.mobile, deleted_at: IsNull() });
  if (user && user.school_id !== schoolId) throw new Error(`${plan.mobile} belongs to another school`);
  if (!user) {
    user = await manager.save(
      manager.create(User, {
        school_id: schoolId,
        name: plan.name,
        mobile: plan.mobile,
        status: 'active',
        language: plan.language,
      }),
    );
  }
  await manager
    .createQueryBuilder()
    .insert()
    .into(UserRole)
    .values({ user_id: user.id, role_id: parentRoleId })
    .orIgnore()
    .execute();
  const existing = await manager.findOneBy(Guardian, {
    school_id: schoolId,
    mobile: plan.mobile,
    deleted_at: IsNull(),
  });
  if (existing) {
    if (existing.user_id !== user.id) await manager.update(Guardian, existing.id, { user_id: user.id });
    return existing;
  }
  counts.guardians += 1;
  return manager.save(
    manager.create(Guardian, {
      school_id: schoolId,
      name: plan.name,
      mobile: plan.mobile,
      occupation: plan.occupation,
      qualification: plan.qualification,
      city: 'Chennai',
      user_id: user.id,
    }),
  );
}

async function nextAdmissionNo(
  manager: EntityManager,
  school: School,
  admittedYear: string,
  sequences: SequencesService,
): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const value = await sequences.next(manager, school.id, `admission:${admittedYear}`);
    const candidate = SequencesService.format(school.code, admittedYear, value);
    if (!(await manager.exists(Student, { where: { school_id: school.id, admission_no: candidate } })))
      return candidate;
  }
  throw new Error('Could not generate an admission number');
}

async function seedStudents(
  manager: EntityManager,
  school: School,
  year: AcademicYear,
  sections: SectionMap,
  counts: Counts,
): Promise<number[]> {
  const sequences = new SequencesService();
  const parentRole = await manager.findOneByOrFail(Role, { code: ROLES.PARENT });
  const plans = buildDemoStudents(STUDENT_QUOTAS, GUARDIAN_MOBILE_BASE);
  const ids: number[] = [];
  for (const [index, plan] of plans.entries()) {
    const section = sections.get(plan.section);
    if (!section) continue;
    const existing = await manager.findOneBy(Student, {
      school_id: school.id,
      first_name: plan.first_name,
      last_name: plan.last_name,
      deleted_at: IsNull(),
    });
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const filled = await manager.countBy(StudentEnrollment, { section_id: section.id });
    if (filled >= section.capacity) continue;
    const admittedYear = plan.admitted.slice(0, 4);
    const student = await manager.save(
      manager.create(Student, {
        school_id: school.id,
        admission_no: await nextAdmissionNo(manager, school, admittedYear, sequences),
        first_name: plan.first_name,
        last_name: plan.last_name,
        dob: plan.dob,
        gender: plan.gender,
        house: plan.house,
        admission_date: plan.admitted,
        status: 'active',
        city: 'Chennai',
        address_line: `${(index % 60) + 1}, ${STREETS[index % STREETS.length]}`,
        pincode: '6000' + String(40 + (index % 12)),
      }),
    );
    const rolls: { roll_no: number | null }[] = await manager.query(
      `SELECT roll_no FROM student_enrollments WHERE section_id = $1`,
      [section.id],
    );
    await manager.insert(StudentEnrollment, {
      school_id: school.id,
      student_id: student.id,
      academic_year_id: year.id,
      class_id: section.class_id,
      section_id: section.id,
      roll_no: freeNumbers(
        rolls.map((row) => (row.roll_no === null ? null : Number(row.roll_no))),
        1,
      )[0]!,
      status: 'studying',
    });
    for (const [position, guardianPlan] of plan.guardians.entries()) {
      const guardian = await ensureGuardian(manager, school.id, guardianPlan, parentRole.id, counts);
      await manager.insert(StudentGuardian, {
        school_id: school.id,
        student_id: student.id,
        guardian_id: guardian.id,
        relation: guardianPlan.relation,
        is_primary: position === 0,
        can_pickup: true,
        receives_alerts: true,
      });
    }
    counts.students += 1;
    ids.push(student.id);
  }
  return ids;
}

async function seedTransport(
  manager: EntityManager,
  school: School,
  year: AcademicYear,
  userIds: Map<string, number>,
  studentIds: number[],
  counts: Counts,
): Promise<void> {
  const busTwo = await manager.findOneBy(Vehicle, {
    school_id: school.id,
    registration_no: BUS_TWO,
    deleted_at: IsNull(),
  });
  if (busTwo) {
    const driver = userIds.get(FINAL_CREW[0]!.mobile);
    const attendant = userIds.get(FINAL_CREW[1]!.mobile);
    const patch: Partial<Vehicle> = {};
    if (!busTwo.driver_user_id && driver) patch.driver_user_id = driver;
    if (!busTwo.attendant_user_id && attendant) patch.attendant_user_id = attendant;
    if (Object.keys(patch).length) await manager.update(Vehicle, busTwo.id, patch);
    counts.crew = Object.keys(patch).length ? 'crew assigned to Bus 2' : 'Bus 2 crew kept';
  }

  let route = await manager.findOneBy(TransportRoute, {
    school_id: school.id,
    code: THIRD_ROUTE.code,
    deleted_at: IsNull(),
  });
  if (!route) {
    route = await manager.save(
      manager.create(TransportRoute, {
        school_id: school.id,
        code: THIRD_ROUTE.code,
        name: THIRD_ROUTE.name,
        vehicle_id: busTwo?.id ?? null,
        is_active: true,
      }),
    );
    counts.route = `${THIRD_ROUTE.code} created`;
  } else {
    counts.route = `${THIRD_ROUTE.code} kept`;
  }
  if (!(await manager.exists(RouteStop, { where: { route_id: route.id } }))) {
    await manager.save(
      THIRD_ROUTE.stops.map(([name, landmark, lat, lng, pickup, drop, fee], sequence) =>
        manager.create(RouteStop, {
          school_id: school.id,
          route_id: route!.id,
          name,
          landmark,
          lat,
          lng,
          sequence: sequence + 1,
          pickup_time: pickup,
          drop_time: drop,
          geofence_radius_m: THIRD_ROUTE.geofence_radius_m,
          monthly_fee: fee,
        }),
      ),
    );
  }

  if (!studentIds.length) return;
  const routes = await manager.find(TransportRoute, {
    where: { school_id: school.id, code: In(Object.keys(RIDER_QUOTAS)), deleted_at: IsNull() },
  });
  const plan: { route: TransportRoute; stops: RouteStop[]; riders: number }[] = [];
  for (const item of routes.sort((a, b) => b.code.localeCompare(a.code))) {
    plan.push({
      route: item,
      stops: await manager.find(RouteStop, { where: { route_id: item.id }, order: { sequence: 'ASC' } }),
      riders: await manager.count(StudentTransport, { where: { route_id: item.id, student_id: In(studentIds) } }),
    });
  }
  const seatsLeft = async (vehicleId: number | null) => {
    if (!vehicleId) return Number.MAX_SAFE_INTEGER;
    const vehicle = await manager.findOneBy(Vehicle, { id: vehicleId });
    const [{ count }] = await manager.query(
      `SELECT COUNT(*) AS count FROM student_transport t JOIN transport_routes r ON r.id = t.route_id
       WHERE r.vehicle_id = $1 AND t.deleted_at IS NULL AND r.deleted_at IS NULL`,
      [vehicleId],
    );
    return (vehicle?.capacity ?? 0) - Number(count);
  };
  const riding = new Set(
    (await manager.find(StudentTransport, { where: { student_id: In(studentIds) } })).map((row) => row.student_id),
  );
  let turn = 0;
  for (const [index, studentId] of studentIds.entries()) {
    if (index % 3 === 1 || riding.has(studentId)) continue;
    for (let attempt = 0; attempt < plan.length; attempt += 1) {
      const item = plan[(turn + attempt) % plan.length]!;
      if (!item.stops.length || item.riders >= (RIDER_QUOTAS[item.route.code] ?? 0)) continue;
      if ((await seatsLeft(item.route.vehicle_id)) <= 0) continue;
      await manager.save(
        manager.create(StudentTransport, {
          school_id: school.id,
          student_id: studentId,
          route_id: item.route.id,
          stop_id: item.stops[item.riders % item.stops.length]!.id,
          mode: index % 7 === 0 ? 'pickup' : 'both',
          start_date: year.start_date,
          passenger_ref: passengerRef(),
        }),
      );
      item.riders += 1;
      counts.riders += 1;
      turn = (turn + attempt + 1) % plan.length;
      break;
    }
  }
}

async function seedTimetable(
  manager: EntityManager,
  schoolId: number,
  year: AcademicYear,
  sections: SectionMap,
  counts: Counts,
): Promise<void> {
  const [bell]: { count: string }[] = await manager.query(
    `SELECT COUNT(*) AS count FROM bell_periods WHERE school_id = $1 AND is_break = false`,
    [schoolId],
  );
  const periods = Number(bell?.count ?? 0);
  if (!periods) return;
  for (const key of TIMETABLE_SECTIONS) {
    const section = sections.get(key);
    if (!section) continue;
    const own = await manager.findBy(TimetableSlot, { section_id: section.id });
    const assignments = await manager.find(TeacherAssignment, {
      where: { section_id: section.id },
      order: { subject_id: 'ASC' },
    });
    const demands = assignments.map((row) => ({
      subject_id: row.subject_id,
      teacher_user_id: row.teacher_user_id,
      count: Math.max(0, row.periods_per_week - own.filter((slot) => slot.subject_id === row.subject_id).length),
    }));
    if (!demands.some((demand) => demand.count > 0)) continue;
    const blocked = new Set(own.map((slot) => cell(slot.day_of_week, slot.period_no)));
    if (section.room) {
      const rooms: { day_of_week: number; period_no: number }[] = await manager.query(
        `SELECT day_of_week, period_no FROM timetable_slots
         WHERE school_id = $1 AND academic_year_id = $2 AND LOWER(room) = LOWER($3) AND section_id <> $4`,
        [schoolId, year.id, section.room, section.id],
      );
      for (const row of rooms) blocked.add(cell(Number(row.day_of_week), Number(row.period_no)));
    }
    const teacherIds = [...new Set(assignments.map((row) => row.teacher_user_id))];
    const busyRows: { teacher_user_id: number; day_of_week: number; period_no: number }[] = await manager.query(
      `SELECT teacher_user_id, day_of_week, period_no FROM timetable_slots
       WHERE academic_year_id = $1 AND teacher_user_id = ANY($2) AND section_id <> $3`,
      [year.id, teacherIds, section.id],
    );
    const teacherBusy = new Map<number, Set<string>>();
    for (const row of busyRows) {
      const id = Number(row.teacher_user_id);
      if (!teacherBusy.has(id)) teacherBusy.set(id, new Set());
      teacherBusy.get(id)!.add(cell(Number(row.day_of_week), Number(row.period_no)));
    }
    const planned = planWeek({
      days: SCHOOL_DAYS,
      periods,
      demands,
      blocked,
      teacherBusy,
      existing: own.map((slot) => ({ day: slot.day_of_week, subject_id: slot.subject_id })),
    });
    await manager.insert(
      TimetableSlot,
      planned.map((slot) => ({
        ...slot,
        school_id: schoolId,
        academic_year_id: year.id,
        section_id: section.id,
        room: section.room,
      })),
    );
    counts.slots += planned.length;
  }
}

export async function seedDemoFinal(manager: EntityManager, school: School): Promise<void> {
  const year = await manager.findOneBy(AcademicYear, { school_id: school.id, is_current: true });
  if (!year) {
    console.log(`Final     ${school.code}  no current academic year: skipped`);
    return;
  }
  const counts: Counts = {
    staff: 0,
    salaries: 0,
    class_subjects: 0,
    assignments: 0,
    class_teachers: 0,
    students: 0,
    guardians: 0,
    riders: 0,
    slots: 0,
    route: 'R3 skipped',
    crew: 'Bus 2 missing',
  };
  const userIds = await seedPeople(manager, school, year, counts);
  const sections = await loadSections(manager, school.id, year.id);
  await seedCurriculum(manager, school.id, year, sections, userIds, counts);
  const studentIds = await seedStudents(manager, school, year, sections, counts);
  await seedTransport(manager, school, year, userIds, studentIds, counts);
  await seedTimetable(manager, school.id, year, sections, counts);
  const teaching = await activeTeaching(manager, school.id);
  console.log(
    `Final     ${school.code}  ${teaching} teaching staff (+${counts.staff} staff, +${counts.salaries} salaries), ` +
      `+${counts.class_subjects} class subjects, +${counts.assignments} assignments, +${counts.class_teachers} class teachers, ` +
      `+${counts.students} students, +${counts.guardians} guardians, +${counts.riders} bus riders, ${counts.route}, ${counts.crew}, ` +
      `+${counts.slots} timetable periods`,
  );
}
