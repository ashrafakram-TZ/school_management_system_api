export type DemoGender = 'male' | 'female';
export type DemoRelation = 'father' | 'mother';

export interface DemoGuardianPlan {
  name: string;
  mobile: string;
  relation: DemoRelation;
  occupation: string;
  qualification: string;
  language: 'en' | 'ta';
}

export interface DemoStudentPlan {
  section: string;
  grade: number;
  first_name: string;
  last_name: string;
  gender: DemoGender;
  dob: string;
  admitted: string;
  house: string;
  guardians: DemoGuardianPlan[];
}

export interface SectionQuota {
  section: string;
  grade: number;
  count: number;
}

const BOYS = [
  'Arivazhagan',
  'Barathi',
  'Cheran',
  'Dhanush',
  'Elanchezhiyan',
  'Ilango',
  'Kathir',
  'Kumaran',
  'Maran',
  'Mugilan',
  'Nedumaran',
  'Pari',
  'Sezhiyan',
  'Thiru',
  'Vetrivel',
  'Yuvan',
  'Adhithya',
  'Aravind',
  'Balaji',
  'Deepak',
  'Gokul',
  'Hariharan',
  'Jeeva',
  'Kishore',
  'Madhavan',
  'Nithish',
  'Prasanth',
  'Ragul',
  'Santhosh',
  'Tamilarasan',
  'Udhaya',
  'Vignesh',
  'Vishnu',
  'Akash',
  'Dinesh',
  'Iniyan',
  'Kavinesh',
  'Magizhan',
  'Nilavan',
  'Sakthivel',
  'Selvan',
  'Thamizhan',
  'Vasanth',
  'Yazhan',
  'Agilan',
  'Kaviyarasu',
  'Mathivanan',
  'Ponmaran',
  'Sudar',
  'Vendhan',
  'Anbu',
  'Ezhilan',
  'Sembiyan',
  'Senthamizh',
  'Arul',
  'Kalaiyarasan',
  'Manoj',
  'Sriram',
  'Pugazh',
  'Vikram',
];

const GIRLS = [
  'Aaradhana',
  'Anbarasi',
  'Bhavani',
  'Charumathi',
  'Devika',
  'Elakkiya',
  'Gayathri',
  'Hamsini',
  'Isai',
  'Kanimozhi',
  'Kayal',
  'Malar',
  'Mathumitha',
  'Nivetha',
  'Poongodi',
  'Pavithra',
  'Ramya',
  'Sangavi',
  'Shalini',
  'Tamilselvi',
  'Thenmozhi',
  'Vaishnavi',
  'Vennila',
  'Abirami',
  'Archana',
  'Bavya',
  'Dhivyashree',
  'Iniya',
  'Jothika',
  'Kaviya',
  'Lavanya',
  'Mahalakshmi',
  'Nandhitha',
  'Preethi',
  'Sowmya',
  'Swetha',
  'Thamarai',
  'Yamini',
  'Akshaya',
  'Brindha',
  'Deepika',
  'Haritha',
  'Kalai',
  'Meghala',
  'Nithyasri',
  'Pooja',
  'Roshini',
  'Sandhiya',
  'Sharmila',
  'Vinothini',
  'Aruvi',
  'Kurinji',
  'Mullai',
  'Sevvanthi',
  'Thendral',
  'Nilani',
  'Pournami',
  'Sanjana',
  'Varshini',
  'Inbavalli',
];

const FATHERS = [
  'Senthilkumar',
  'Muthukumar',
  'Ravichandran',
  'Elangovan',
  'Rajasekar',
  'Kannadasan',
  'Palanisamy',
  'Sivakumar',
  'Annadurai',
  'Velmurugan',
  'Jayakumar',
  'Balamurugan',
  'Thirunavukkarasu',
  'Ganesan',
  'Kathiresan',
  'Sundaram',
  'Arumugam',
  'Chandrasekar',
  'Dhanasekaran',
  'Gunasekaran',
  'Ilayaraja',
  'Karunanidhi',
  'Mahendran',
  'Nagarajan',
  'Panneerselvam',
  'Ramalingam',
  'Saravanakumar',
  'Thangaraj',
  'Vadivel',
  'Sakthivel',
  'Manikandan',
  'Selvaraj',
  'Pandiyan',
  'Rajendran',
  'Venkatesan',
  'Kumaresan',
  'Duraisamy',
  'Sekar',
  'Murugesan',
  'Ponnusamy',
];

const MOTHERS = [
  'Kavitha',
  'Sumathi',
  'Vasanthi',
  'Malathi',
  'Revathi',
  'Jayanthi',
  'Selvi',
  'Amudha',
  'Chitra',
  'Deepa',
  'Geetha',
  'Hemalatha',
  'Indira',
  'Jothi',
  'Kalaivani',
  'Latha',
  'Meena',
  'Nirmala',
  'Padma',
  'Rani',
];

const OCCUPATIONS: [string, string][] = [
  ['Software engineer', 'B.E.'],
  ['Shop owner', 'HSC'],
  ['Bank officer', 'M.B.A.'],
  ['Auto driver', 'SSLC'],
  ['Government employee', 'B.A.'],
  ['Electrician', 'Diploma'],
  ['Doctor', 'M.B.B.S.'],
  ['Accountant', 'B.Com.'],
  ['Teacher', 'M.A., B.Ed.'],
  ['Homemaker', 'HSC'],
];

const HOUSES = ['Red', 'Blue', 'Green', 'Yellow'];

export function demoMobile(base: number, offset: number): string {
  const value = base + offset;
  if (value > 9999999999 || value < 6000000000) throw new Error(`Mobile ${value} is out of range`);
  return String(value);
}

export function dobForGrade(grade: number, index: number): string {
  const birthYear = 2026 - (grade + 6);
  const month = ((index * 5) % 12) + 1;
  const day = ((index * 7) % 27) + 1;
  const year = month <= 5 ? birthYear + 1 : birthYear;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function admissionDate(grade: number, index: number): string {
  const yearsBack = index % Math.min(Math.max(grade, 1), 5);
  return `${2026 - yearsBack}-06-0${(index % 5) + 1}`;
}

export function buildDemoStudents(quotas: SectionQuota[], guardianMobileBase: number): DemoStudentPlan[] {
  const plans: DemoStudentPlan[] = [];
  let boys = 0;
  let girls = 0;
  let guardians = 0;
  let index = 0;
  for (const quota of quotas) {
    for (let seat = 0; seat < quota.count; seat += 1) {
      const gender: DemoGender = (seat + quota.grade) % 2 === 0 ? 'male' : 'female';
      const pool = gender === 'male' ? BOYS : GIRLS;
      const used = gender === 'male' ? boys++ : girls++;
      if (used >= pool.length) throw new Error(`Not enough ${gender} names for ${quotas.length} sections`);
      const father = FATHERS[index % FATHERS.length]!;
      const grandfather = FATHERS[(index * 7 + 3) % FATHERS.length]!;
      const mother = MOTHERS[(index * 3) % MOTHERS.length]!;
      const [occupation, qualification] = OCCUPATIONS[index % OCCUPATIONS.length]!;
      const fatherGuardian = (): DemoGuardianPlan => ({
        name: `${father} ${grandfather}`,
        mobile: demoMobile(guardianMobileBase, ++guardians),
        relation: 'father',
        occupation: occupation === 'Homemaker' ? 'Business' : occupation,
        qualification,
        language: index % 3 === 1 ? 'ta' : 'en',
      });
      const motherGuardian = (): DemoGuardianPlan => ({
        name: `${mother} ${father}`,
        mobile: demoMobile(guardianMobileBase, ++guardians),
        relation: 'mother',
        occupation: index % 2 === 0 ? 'Homemaker' : occupation,
        qualification,
        language: index % 2 === 0 ? 'ta' : 'en',
      });
      const family =
        index % 4 === 0
          ? [fatherGuardian(), motherGuardian()]
          : index % 3 === 2
            ? [motherGuardian()]
            : [fatherGuardian()];
      plans.push({
        section: quota.section,
        grade: quota.grade,
        first_name: pool[used]!,
        last_name: father,
        gender,
        dob: dobForGrade(quota.grade, index),
        admitted: admissionDate(quota.grade, index),
        house: HOUSES[index % HOUSES.length]!,
        guardians: family,
      });
      index += 1;
    }
  }
  return plans;
}

export function freeNumbers(used: (number | null)[], count: number): number[] {
  const taken = new Set(used.filter((value): value is number => value !== null));
  const result: number[] = [];
  for (let candidate = 1; result.length < count; candidate += 1) {
    if (!taken.has(candidate)) result.push(candidate);
  }
  return result;
}

export interface WeekDemand {
  subject_id: number;
  teacher_user_id: number | null;
  count: number;
}

export interface WeekInput {
  days: number[];
  periods: number;
  demands: WeekDemand[];
  blocked: Set<string>;
  teacherBusy: Map<number, Set<string>>;
  existing?: { day: number; subject_id: number }[];
  maxPerDay?: number;
}

export interface PlannedSlot {
  day_of_week: number;
  period_no: number;
  subject_id: number;
  teacher_user_id: number | null;
}

export const cell = (day: number, period: number) => `${day}:${period}`;

export function planWeek(input: WeekInput): PlannedSlot[] {
  const maxPerDay = input.maxPerDay ?? 2;
  const units = input.demands
    .filter((demand) => demand.count > 0)
    .sort((a, b) => b.count - a.count || a.subject_id - b.subject_id)
    .flatMap((demand) => Array.from({ length: demand.count }, () => demand));
  const used = new Set(input.blocked);
  const perDay = new Map<string, number>();
  for (const row of input.existing ?? []) {
    const key = `${row.subject_id}:${row.day}`;
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  const busy = (teacher: number | null, key: string) =>
    teacher !== null && (input.teacherBusy.get(teacher)?.has(key) ?? false);
  const result: PlannedSlot[] = [];
  let steps = 0;

  const place = (position: number): boolean => {
    if (position === units.length) return true;
    if ((steps += 1) > 200000) return false;
    const unit = units[position]!;
    const days = [...input.days].sort(
      (a, b) =>
        (perDay.get(`${unit.subject_id}:${a}`) ?? 0) - (perDay.get(`${unit.subject_id}:${b}`) ?? 0) ||
        ((a + position) % input.days.length) - ((b + position) % input.days.length),
    );
    for (const day of days) {
      const dayKey = `${unit.subject_id}:${day}`;
      if ((perDay.get(dayKey) ?? 0) >= maxPerDay) continue;
      for (let period = 1; period <= input.periods; period += 1) {
        const key = cell(day, period);
        if (used.has(key) || busy(unit.teacher_user_id, key)) continue;
        used.add(key);
        perDay.set(dayKey, (perDay.get(dayKey) ?? 0) + 1);
        result.push({
          day_of_week: day,
          period_no: period,
          subject_id: unit.subject_id,
          teacher_user_id: unit.teacher_user_id,
        });
        if (place(position + 1)) return true;
        result.pop();
        perDay.set(dayKey, perDay.get(dayKey)! - 1);
        used.delete(key);
      }
    }
    return false;
  };

  if (!place(0)) throw new Error('No clash-free timetable fits these periods');
  return result.sort((a, b) => a.day_of_week - b.day_of_week || a.period_no - b.period_no);
}
