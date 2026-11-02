import { AttentionReason } from './dto/staff-response.dto';
import { StaffType } from './entities/staff.entity';

export interface StaffMetrics {
  load: number;
  sections: number;
  documents: number;
  pending: number;
  rejected: number;
}

export function attentionReasons(
  staff: { staff_type: StaffType; bank_account_last4: string | null; max_periods_per_week: number },
  metrics: StaffMetrics,
): AttentionReason[] {
  const reasons: AttentionReason[] = [];
  if (metrics.rejected > 0) reasons.push('document_rejected');
  if (metrics.pending > 0) reasons.push('documents_pending');
  if (metrics.documents === 0) reasons.push('no_documents');
  if (!staff.bank_account_last4) reasons.push('bank_missing');
  if (staff.staff_type === 'teaching' && metrics.sections === 0) reasons.push('no_classes');
  if (metrics.load > staff.max_periods_per_week) reasons.push('overloaded');
  return reasons;
}

export function experienceYears(joiningDate: string, priorYears: number, today: string): number {
  const [jy, jm, jd] = joiningDate.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  let years = ty - jy;
  if (tm < jm || (tm === jm && td < jd)) years -= 1;
  return Math.max(0, years) + priorYears;
}

export function averageLoad(loads: number[]): number {
  if (!loads.length) return 0;
  return Math.round((loads.reduce((sum, value) => sum + value, 0) / loads.length) * 10) / 10;
}

export const ATTENTION_SQL = `(
  st.bank_account_last4 IS NULL
  OR NOT EXISTS (SELECT 1 FROM staff_documents d WHERE d.staff_id = st.id AND d.deleted_at IS NULL)
  OR EXISTS (SELECT 1 FROM staff_documents d WHERE d.staff_id = st.id AND d.deleted_at IS NULL AND d.status <> 'verified')
  OR (st.staff_type = 'teaching' AND NOT EXISTS (
    SELECT 1 FROM teacher_assignments ta WHERE ta.teacher_user_id = st.user_id AND ta.academic_year_id = :yearId AND ta.deleted_at IS NULL))
  OR (SELECT COALESCE(SUM(ta.periods_per_week), 0) FROM teacher_assignments ta
      WHERE ta.teacher_user_id = st.user_id AND ta.academic_year_id = :yearId AND ta.deleted_at IS NULL) > st.max_periods_per_week
)`;

export const OVERLOADED_SQL = `(SELECT COALESCE(SUM(ta.periods_per_week), 0) FROM teacher_assignments ta
  WHERE ta.teacher_user_id = st.user_id AND ta.academic_year_id = :yearId AND ta.deleted_at IS NULL) > st.max_periods_per_week`;

export const CLASS_TEACHER_SQL = `EXISTS (SELECT 1 FROM sections sec WHERE sec.class_teacher_user_id = st.user_id
  AND sec.academic_year_id = :yearId AND sec.deleted_at IS NULL)`;
