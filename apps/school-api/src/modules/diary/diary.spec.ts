import { canEdit, dueDateError, initialStatus, needsReview, scopeErrors, targetLabel } from './diary.logic';

describe('diary review mode (School setup → Diary review)', () => {
  it('all: every post waits for the office', () => {
    for (const type of ['homework', 'remark', 'feedback', 'note'] as const) {
      expect(needsReview('all', type)).toBe(true);
      expect(initialStatus('all', type)).toBe('pending_review');
    }
  });

  it('remarks: only remarks and feedback wait; homework and notes go out at once', () => {
    expect(initialStatus('remarks', 'remark')).toBe('pending_review');
    expect(initialStatus('remarks', 'feedback')).toBe('pending_review');
    expect(initialStatus('remarks', 'homework')).toBe('published');
    expect(initialStatus('remarks', 'note')).toBe('published');
  });

  it('none: no review, all posts go directly to parents', () => {
    for (const type of ['homework', 'remark', 'feedback', 'note'] as const) {
      expect(needsReview('none', type)).toBe(false);
      expect(initialStatus('none', type)).toBe('published');
    }
  });
});

describe('editing', () => {
  it('allows editing only before parents can see it', () => {
    expect(canEdit('pending_review')).toBe(true);
    expect(canEdit('rejected')).toBe(true);
    expect(canEdit('published')).toBe(false);
    expect(canEdit('hidden')).toBe(false);
  });
});

describe('audience', () => {
  it('needs the class, the section, or at least one student', () => {
    expect(scopeErrors({ scope: 'class' })[0]?.field).toBe('class_id');
    expect(scopeErrors({ scope: 'section' })[0]?.field).toBe('section_id');
    expect(scopeErrors({ scope: 'students', student_ids: [] })[0]?.field).toBe('student_ids');
    expect(scopeErrors({ scope: 'section', section_id: 4 })).toEqual([]);
  });

  it('refuses a student listed twice and more than 60 students', () => {
    expect(scopeErrors({ scope: 'students', student_ids: [1, 1] })[0]?.message).toContain('twice');
    expect(
      scopeErrors({ scope: 'students', student_ids: Array.from({ length: 61 }, (_, i) => i + 1) })[0]?.message,
    ).toContain('60');
  });

  it('names the audience for lists', () => {
    expect(targetLabel('section', { class_name: '6', section_name: 'A' })).toBe('6 - A');
    expect(targetLabel('class', { class_name: '6' })).toBe('Class 6');
    expect(targetLabel('students', { students: 1 })).toBe('1 student');
    expect(targetLabel('students', { students: 3 })).toBe('3 students');
  });
});

describe('due date', () => {
  const today = '2026-11-11';

  it('is only for homework and not in the past', () => {
    expect(dueDateError('homework', '2026-11-12', today)).toBeNull();
    expect(dueDateError('homework', null, today)).toBeNull();
    expect(dueDateError('homework', '2026-11-10', today)?.message).toBe('The due date has already passed');
    expect(dueDateError('remark', '2026-11-12', today)?.message).toBe('Only homework has a due date');
  });
});
