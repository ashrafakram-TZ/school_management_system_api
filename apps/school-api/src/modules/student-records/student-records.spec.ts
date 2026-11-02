import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { VerifyDocumentDto } from '../../shared/verification';
import { BehaviourInputDto, HealthInputDto } from './dto/records.dto';
import { bmi, DOCUMENT_TITLES, isOverdue } from './student-records.service';

const errors = async <T extends object>(type: new () => T, plain: object) =>
  (await validate(plainToInstance(type, plain), { whitelist: true, forbidNonWhitelisted: true })).map(
    (error) => error.property,
  );

describe('health record', () => {
  it('works out BMI to one decimal', () => {
    expect(bmi(138.5, 31.2)).toBe(16.3);
    expect(bmi(null, 31.2)).toBeNull();
    expect(bmi(138.5, null)).toBeNull();
  });

  it('marks a vaccination overdue only when it is due and not given', () => {
    expect(isOverdue({ given_on: null, due_on: '2026-10-01' }, '2026-11-02')).toBe(true);
    expect(isOverdue({ given_on: null, due_on: '2026-11-02' }, '2026-11-02')).toBe(true);
    expect(isOverdue({ given_on: null, due_on: '2027-01-01' }, '2026-11-02')).toBe(false);
    expect(isOverdue({ given_on: '2026-10-05', due_on: '2026-10-01' }, '2026-11-02')).toBe(false);
    expect(isOverdue({ given_on: null, due_on: null }, '2026-11-02')).toBe(false);
  });

  it('accepts partial updates, clears with null and rejects impossible values', async () => {
    expect(await errors(HealthInputDto, { weight_kg: 32 })).toEqual([]);
    expect(await errors(HealthInputDto, { allergies: null, doctor_mobile: '+91 98411 22334' })).toEqual([]);
    expect(await errors(HealthInputDto, { height_cm: 999 })).toEqual(['height_cm']);
    expect(await errors(HealthInputDto, { doctor_mobile: '12345' })).toEqual(['doctor_mobile']);
    expect(await errors(HealthInputDto, { last_checkup_on: '15-07-2026' })).toEqual(['last_checkup_on']);
  });
});

describe('document verification', () => {
  it('needs a reason only when rejecting', async () => {
    expect(await errors(VerifyDocumentDto, { status: 'verified' })).toEqual([]);
    expect(await errors(VerifyDocumentDto, { status: 'rejected' })).toEqual(['remarks']);
    expect(await errors(VerifyDocumentDto, { status: 'rejected', remarks: '   ' })).toEqual(['remarks']);
    expect(await errors(VerifyDocumentDto, { status: 'rejected', remarks: 'Copy is blurred' })).toEqual([]);
    expect(await errors(VerifyDocumentDto, { status: 'pending' })).toEqual(['status']);
  });

  it('has a readable title for every document type', () => {
    expect(Object.values(DOCUMENT_TITLES).every((title) => title.length > 2)).toBe(true);
  });
});

describe('behaviour notes', () => {
  it('needs a category and a short title', async () => {
    expect(await errors(BehaviourInputDto, { category: 'appreciation', title: 'Neat notebook' })).toEqual([]);
    expect(await errors(BehaviourInputDto, { category: 'praise', title: 'Neat notebook' })).toEqual(['category']);
    expect(await errors(BehaviourInputDto, { category: 'concern', title: 'No' })).toEqual(['title']);
  });
});
