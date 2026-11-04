import { FieldError } from '@app/common';
import { DiaryReviewMode } from '../schools/entities/school.entity';
import { DiaryScope, DiaryStatus, DiaryType } from './entities/diary-entry.entity';

export const MAX_ATTACHMENTS = 5;
export const MAX_STUDENTS = 60;
export const REVIEWED_TYPES: DiaryType[] = ['remark', 'feedback'];
export const EDITABLE_STATUSES: DiaryStatus[] = ['pending_review', 'rejected'];

export const TYPE_LABELS: Record<DiaryType, string> = {
  homework: 'homework',
  remark: 'a remark',
  feedback: 'feedback',
  note: 'a note',
};

export function needsReview(mode: DiaryReviewMode, type: DiaryType): boolean {
  return mode === 'all' || REVIEWED_TYPES.includes(type);
}

export function initialStatus(mode: DiaryReviewMode, type: DiaryType): DiaryStatus {
  return needsReview(mode, type) ? 'pending_review' : 'published';
}

export function canEdit(status: DiaryStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

export function scopeErrors(input: {
  scope: DiaryScope;
  class_id?: number | null;
  section_id?: number | null;
  student_ids?: number[] | null;
}): FieldError[] {
  if (input.scope === 'class' && !input.class_id) {
    return [{ field: 'class_id', message: 'Choose the class' }];
  }
  if (input.scope === 'section' && !input.section_id) {
    return [{ field: 'section_id', message: 'Choose the section' }];
  }
  if (input.scope === 'students') {
    const ids = input.student_ids ?? [];
    if (!ids.length) return [{ field: 'student_ids', message: 'Choose at least one student' }];
    if (new Set(ids).size !== ids.length) return [{ field: 'student_ids', message: 'A student is listed twice' }];
    if (ids.length > MAX_STUDENTS) {
      return [{ field: 'student_ids', message: `Choose up to ${MAX_STUDENTS} students, or post to the section` }];
    }
  }
  return [];
}

export function dueDateError(type: DiaryType, dueDate: string | null | undefined, today: string): FieldError | null {
  if (!dueDate) return null;
  if (type !== 'homework') return { field: 'due_date', message: 'Only homework has a due date' };
  if (dueDate < today) return { field: 'due_date', message: 'The due date has already passed' };
  return null;
}

export function targetLabel(
  scope: DiaryScope,
  names: { class_name?: string | null; section_name?: string | null; students?: number },
): string {
  if (scope === 'class') return `Class ${names.class_name ?? ''}`.trim();
  if (scope === 'section') return [names.class_name, names.section_name].filter(Boolean).join(' - ');
  const count = names.students ?? 0;
  return `${count} ${count === 1 ? 'student' : 'students'}`;
}
