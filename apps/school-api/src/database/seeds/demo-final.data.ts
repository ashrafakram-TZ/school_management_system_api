import { ROLES, RoleCode } from '../../modules/access/access.catalog';
import { SectionQuota } from './demo-final.plan';

export interface FinalStaff {
  mobile: string;
  name: string;
  roles: RoleCode[];
  type: 'teaching' | 'non_teaching';
  designation: string;
  department: string;
  gender: 'male' | 'female';
  joined: string;
  prior: number;
  degrees: [string, string | null, number][];
  bank?: [string, string, string];
  reserve?: boolean;
  licence?: [string, string];
}

export const TEACHING_TARGET = 24;
export const GUARDIAN_MOBILE_BASE = 9000001000;

export const FINAL_TEACHERS: FinalStaff[] = [
  {
    mobile: '9000000601',
    name: 'Anitha Ramasamy',
    roles: [ROLES.TEACHER],
    type: 'teaching',
    designation: 'Secondary Grade Teacher',
    department: 'Primary',
    gender: 'female',
    joined: '2016-06-06',
    prior: 3,
    degrees: [
      ['B.Lit.', 'Tamil', 2011],
      ['D.T.Ed.', null, 2013],
    ],
    bank: ['Indian Bank', 'IDIB000A045', '6012346601'],
  },
  {
    mobile: '9000000602',
    name: 'Gomathi Sekar',
    roles: [ROLES.TEACHER],
    type: 'teaching',
    designation: 'Secondary Grade Teacher',
    department: 'Primary',
    gender: 'female',
    joined: '2019-06-03',
    prior: 2,
    degrees: [
      ['B.Sc.', 'Mathematics', 2014],
      ['D.T.Ed.', null, 2016],
    ],
  },
  {
    mobile: '9000000603',
    name: 'Vijayalakshmi Mohan',
    roles: [ROLES.TEACHER],
    type: 'teaching',
    designation: 'Secondary Grade Teacher',
    department: 'Primary',
    gender: 'female',
    joined: '2013-06-03',
    prior: 5,
    degrees: [
      ['B.A.', 'English', 2006],
      ['D.T.Ed.', null, 2008],
    ],
    bank: ['State Bank of India', 'SBIN0001234', '30123466031'],
  },
  {
    mobile: '9000000604',
    name: 'Saravanan Pandi',
    roles: [ROLES.TEACHER],
    type: 'teaching',
    designation: 'Secondary Grade Teacher',
    department: 'Primary',
    gender: 'male',
    joined: '2020-06-01',
    prior: 1,
    degrees: [
      ['B.Sc.', 'Botany', 2016],
      ['B.Ed.', null, 2018],
    ],
  },
  {
    mobile: '9000000605',
    name: 'Jayanthi Raghu',
    roles: [ROLES.TEACHER],
    type: 'teaching',
    designation: 'Secondary Grade Teacher',
    department: 'Primary',
    gender: 'female',
    joined: '2015-06-01',
    prior: 4,
    degrees: [
      ['B.A.', 'History', 2009],
      ['D.T.Ed.', null, 2011],
    ],
    bank: ['Canara Bank', 'CNRB0001023', '1023101006605'],
  },
  {
    mobile: '9000000606',
    name: 'Murali Krishnan',
    roles: [ROLES.TEACHER],
    type: 'teaching',
    designation: 'Secondary Grade Teacher',
    department: 'Primary',
    gender: 'male',
    joined: '2018-06-04',
    prior: 2,
    degrees: [
      ['B.Sc.', 'Physics', 2013],
      ['B.Ed.', null, 2014],
    ],
  },
  {
    mobile: '9000000607',
    name: 'Tamilselvi Arumugam',
    roles: [ROLES.TEACHER],
    type: 'teaching',
    designation: 'BT Assistant',
    department: 'Tamil',
    gender: 'female',
    joined: '2014-06-02',
    prior: 6,
    degrees: [
      ['M.A.', 'Tamil', 2008],
      ['B.Ed.', null, 2009],
    ],
    bank: ['Indian Overseas Bank', 'IOBA0000321', '032101000066070'],
  },
  {
    mobile: '9000000608',
    name: 'Sangeetha Ravi',
    roles: [ROLES.TEACHER],
    type: 'teaching',
    designation: 'BT Assistant',
    department: 'Hindi',
    gender: 'female',
    joined: '2022-06-06',
    prior: 2,
    degrees: [
      ['M.A.', 'Hindi', 2018],
      ['B.Ed.', null, 2019],
    ],
  },
  {
    mobile: '9000000609',
    name: 'Manikandan Velu',
    roles: [ROLES.TEACHER],
    type: 'teaching',
    designation: 'Physical Education Teacher',
    department: 'Sports',
    gender: 'male',
    joined: '2021-06-07',
    prior: 3,
    degrees: [['B.P.Ed.', 'Physical Education', 2016]],
  },
  {
    mobile: '9000000610',
    name: 'Nithya Balaji',
    roles: [ROLES.TEACHER],
    type: 'teaching',
    designation: 'Art Teacher',
    department: 'Arts',
    gender: 'female',
    joined: '2023-06-05',
    prior: 1,
    degrees: [['B.F.A.', 'Painting', 2020]],
  },
  {
    mobile: '9000000611',
    name: 'Prakash Subramani',
    roles: [ROLES.TEACHER],
    type: 'teaching',
    designation: 'BT Assistant',
    department: 'Science',
    gender: 'male',
    joined: '2017-06-05',
    prior: 4,
    degrees: [
      ['M.Sc.', 'Chemistry', 2012],
      ['B.Ed.', null, 2013],
    ],
    bank: ['HDFC Bank', 'HDFC0000123', '50100234566110'],
  },
  {
    mobile: '9000000612',
    name: 'Bhuvaneswari Kumar',
    roles: [ROLES.TEACHER],
    type: 'teaching',
    designation: 'BT Assistant',
    department: 'Social Science',
    gender: 'female',
    joined: '2016-06-06',
    prior: 2,
    degrees: [
      ['M.A.', 'Geography', 2011],
      ['B.Ed.', null, 2012],
    ],
  },
  {
    mobile: '9000000613',
    name: 'Rajkumar Annamalai',
    roles: [ROLES.TEACHER],
    type: 'teaching',
    designation: 'PG Assistant',
    department: 'Mathematics',
    gender: 'male',
    joined: '2012-06-04',
    prior: 7,
    degrees: [
      ['M.Sc.', 'Mathematics', 2004],
      ['M.Ed.', null, 2006],
    ],
    bank: ['Karur Vysya Bank', 'KVBL0001101', '1101155000066130'],
  },
  {
    mobile: '9000000614',
    name: 'Kalpana Devaraj',
    roles: [ROLES.TEACHER],
    type: 'teaching',
    designation: 'Special Educator',
    department: 'Special Education',
    gender: 'female',
    joined: '2024-06-03',
    prior: 3,
    degrees: [['B.Ed.', 'Special Education', 2019]],
    reserve: true,
  },
  {
    mobile: '9000000615',
    name: 'Elango Thangaraj',
    roles: [ROLES.TEACHER],
    type: 'teaching',
    designation: 'Music Teacher',
    department: 'Music',
    gender: 'male',
    joined: '2024-06-03',
    prior: 5,
    degrees: [['B.Mus.', 'Carnatic Music', 2015]],
    reserve: true,
  },
];

export const FINAL_CREW: FinalStaff[] = [
  {
    mobile: '9000000701',
    name: 'Muthu Krishnan',
    roles: [ROLES.DRIVER],
    type: 'non_teaching',
    designation: 'Bus Driver',
    department: 'Transport',
    gender: 'male',
    joined: '2022-01-10',
    prior: 12,
    degrees: [['SSLC', null, 2002]],
    bank: ['Indian Bank', 'IDIB000A045', '6012346701'],
    licence: ['TN0520120067890', '2030-02-28'],
  },
  {
    mobile: '9000000702',
    name: 'Saroja Velu',
    roles: [ROLES.ATTENDANT],
    type: 'non_teaching',
    designation: 'Bus Attendant',
    department: 'Transport',
    gender: 'female',
    joined: '2023-06-05',
    prior: 1,
    degrees: [['SSLC', null, 2010]],
  },
];

export const PRIMARY_SUBJECTS: [string, number][] = [
  ['ENG', 6],
  ['TAM', 6],
  ['MATH', 7],
  ['EVS', 6],
  ['HIN', 3],
  ['CS', 2],
  ['PE', 3],
  ['ART', 3],
];

const PRIMARY_SHARED = { HIN: '9000000608', CS: '9000000405', PE: '9000000609', ART: '9000000610' };

const primary = (homeroom: string, tamil: string) => ({
  ENG: homeroom,
  MATH: homeroom,
  EVS: homeroom,
  TAM: tamil,
  ...PRIMARY_SHARED,
});

export const FINAL_ASSIGNMENTS: Record<string, Record<string, string>> = {
  '1-A': primary('9000000601', '9000000607'),
  '1-B': primary('9000000602', '9000000607'),
  '2-A': primary('9000000603', '9000000607'),
  '3-A': primary('9000000604', '9000000607'),
  '4-A': primary('9000000605', '9000000607'),
  '5-A': primary('9000000606', '9000000604'),
  '6-A': { CS: '9000000405' },
  '6-B': { CS: '9000000405', HIN: '9000000406' },
  '7-A': { MATH: '9000000613', HIN: '9000000406' },
  '7-B': { SOC: '9000000403', CS: '9000000405', HIN: '9000000406' },
  '8-A': { SCI: '9000000611', SOC: '9000000612' },
  '8-B': {
    MATH: '9000000613',
    SCI: '9000000611',
    SOC: '9000000612',
    CS: '9000000405',
    HIN: '9000000406',
  },
};

export const MIDDLE_PERIODS: Record<string, number> = {
  ENG: 6,
  TAM: 5,
  MATH: 7,
  SCI: 6,
  SOC: 5,
  CS: 2,
  PE: 2,
  HIN: 3,
};

export const FINAL_CLASS_TEACHERS: Record<string, string> = {
  'UKG-A': '9000000610',
  '1-A': '9000000601',
  '1-B': '9000000602',
  '2-A': '9000000603',
  '3-A': '9000000604',
  '4-A': '9000000605',
  '5-A': '9000000606',
};

export const STUDENT_QUOTAS: SectionQuota[] = [
  { section: '1-A', grade: 1, count: 11 },
  { section: '1-B', grade: 1, count: 10 },
  { section: '2-A', grade: 2, count: 11 },
  { section: '3-A', grade: 3, count: 10 },
  { section: '4-A', grade: 4, count: 11 },
  { section: '5-A', grade: 5, count: 11 },
  { section: '6-A', grade: 6, count: 3 },
  { section: '6-B', grade: 6, count: 5 },
  { section: '7-A', grade: 7, count: 6 },
  { section: '7-B', grade: 7, count: 9 },
  { section: '8-A', grade: 8, count: 9 },
  { section: '8-B', grade: 8, count: 9 },
];

export const TIMETABLE_SECTIONS = ['7-A', '8-A'];

export const THIRD_ROUTE = {
  code: 'R3',
  name: 'Kolathur - Villivakkam - School',
  stops: [
    ['Retteri junction', 'Near the metro pillar', 13.1323, 80.2148, '06:30', '16:30', 1600],
    ['Kolathur market', 'Opposite the Murugan temple', 13.1237, 80.2129, '06:38', '16:22', 1400],
    ['Villivakkam railway station', 'Station road entrance', 13.1103, 80.2092, '06:46', '16:14', 1200],
    ['Villivakkam bus terminus', null, 13.1054, 80.2084, '06:50', '16:10', 1100],
    ['ICF main gate', 'Near the ICF museum road', 13.0981, 80.2076, '06:56', '16:04', 900],
  ] as [string, string | null, number, number, string, string, number][],
  geofence_radius_m: 150,
};

export const RIDER_QUOTAS: Record<string, number> = { R1: 12, R2: 8, R3: 14 };
