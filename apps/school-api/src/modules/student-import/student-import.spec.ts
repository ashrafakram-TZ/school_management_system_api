import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateStudentDto } from '../students/dto/student-input.dto';
import { cellText, headerKey, isBlankRow, normalizeDate } from './import-sheet';
import { columnFor, flattenErrors, friendlyMessage, headerOf, isRealDate } from './student-import.service';

describe('reading Excel cells', () => {
  it('turns cell values into text', () => {
    expect(cellText(null)).toBe('');
    expect(cellText(9876543210)).toBe('9876543210');
    expect(cellText(new Date('2015-03-14T00:00:00Z'))).toBe('2015-03-14');
    expect(cellText('  Kavin  ')).toBe('Kavin');
    expect(cellText({ richText: [{ text: 'Ka' }, { text: 'vin' }] })).toBe('Kavin');
    expect(cellText({ formula: 'A1', result: 'Nila' } as never)).toBe('Nila');
  });

  it('accepts Indian and ISO dates', () => {
    expect(normalizeDate('14-03-2015')).toBe('2015-03-14');
    expect(normalizeDate('4/3/2015')).toBe('2015-03-04');
    expect(normalizeDate('2015-3-4')).toBe('2015-03-04');
    expect(normalizeDate('March 2015')).toBe('March 2015');
    expect(isRealDate('2015-02-28')).toBe(true);
    expect(isRealDate('2015-02-30')).toBe(false);
  });

  it('matches headers with or without the required star', () => {
    expect(headerKey('First name *')).toBe('first_name');
    expect(headerKey('father_mobile')).toBe('father_mobile');
    expect(headerKey('Parent language')).toBe('language');
    expect(headerKey('Shoe size')).toBeNull();
    expect(isBlankRow({ first_name: '', class: '' })).toBe(true);
  });
});

describe('import validation report', () => {
  it('points guardian errors at the right column', () => {
    expect(columnFor('guardians.0.mobile', ['mother'])).toBe('mother_mobile');
    expect(columnFor('guardians.1.name', ['father', 'guardian'])).toBe('guardian_name');
    expect(columnFor('class_id', [])).toBe('class');
    expect(columnFor('guardians', [])).toBe('father_mobile');
    expect(columnFor('dob', [])).toBe('dob');
  });

  it('writes messages with the column names people see', () => {
    expect(headerOf('dob')).toBe('Date of birth');
    expect(friendlyMessage('first_name', 'first_name must be longer than or equal to 1 characters', '')).toBe(
      'First name is required',
    );
    expect(friendlyMessage('father_mobile', 'mobile must be a valid 10-digit Indian mobile number', '12345')).toBe(
      'Father mobile must be a valid 10-digit Indian mobile number',
    );
    expect(friendlyMessage('father_mobile', 'Add at least one parent or guardian', '')).toContain(
      'at least one parent',
    );
  });

  it('reuses the same rules as the add student form', async () => {
    const dto = plainToInstance(CreateStudentDto, {
      first_name: 'Yazhini',
      dob: '2015-03-14',
      gender: 'female',
      class_id: 7,
      guardians: [{ name: 'Murugan', mobile: '+91 90000 00501', relation: 'father', is_primary: true, language: 'ta' }],
    });
    expect(flattenErrors(await validate(dto, { whitelist: true, forbidNonWhitelisted: true }))).toEqual([]);
    expect(dto.guardians[0].mobile).toBe('9000000501');

    const bad = plainToInstance(CreateStudentDto, {
      first_name: 'X',
      dob: '2015-03-14',
      gender: 'boy',
      class_id: 7,
      guardians: [{ name: 'Raja', mobile: '12345', relation: 'father' }],
    });
    const fields = flattenErrors(await validate(bad, { whitelist: true })).map((error) => error.field);
    expect(fields).toEqual(expect.arrayContaining(['gender', 'guardians.0.mobile']));
  });
});
