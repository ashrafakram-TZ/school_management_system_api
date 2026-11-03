import { EntityManager } from 'typeorm';
import { FeeHead } from '../../modules/fees/entities/fee-head.entity';
import { FeeInvoice } from '../../modules/fees/entities/fee-invoice.entity';
import { FeePlan } from '../../modules/fees/entities/fee-plan.entity';
import { PaymentMode } from '../../modules/fees/entities/fee-payment.entity';
import { FeeYear, generateInvoices, recordPayment } from '../../modules/fees/fee-ledger';
import { applyDiscount, round2 } from '../../modules/fees/fees.logic';
import { School } from '../../modules/schools/entities/school.entity';
import { todayIn } from '../../shared/dates';
import { addDays } from '../../shared/school-days';

const HEADS = [
  { code: 'TUITION', name: 'Tuition fee', is_transport: false },
  { code: 'BOOKS', name: 'Books and stationery', is_transport: false },
  { code: 'TRANSPORT', name: 'Transport', is_transport: true },
];

const MODES: PaymentMode[] = ['upi', 'cash', 'bank_transfer', 'card', 'cheque'];

function shiftMonth(date: string, months: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + months, Math.min(day, 28)));
  return shifted.toISOString().slice(0, 10);
}

export async function seedDemoFees(manager: EntityManager, school: School): Promise<void> {
  const schoolId = school.id;
  if (await manager.exists(FeeHead, { where: { school_id: schoolId } })) {
    console.log('Fees      demo fee heads already exist: kept');
    return;
  }
  const [yearRow] = await manager.query(
    `SELECT id, name, to_char(start_date, 'YYYY-MM-DD') AS start_date, to_char(end_date, 'YYYY-MM-DD') AS end_date
     FROM academic_years WHERE school_id = $1 AND is_current = true AND deleted_at IS NULL`,
    [schoolId],
  );
  if (!yearRow) return;
  const year: FeeYear = { ...yearRow, id: Number(yearRow.id) };
  const today = todayIn(process.env.APP_TIMEZONE || 'Asia/Kolkata');
  const term1Due = shiftMonth(today, -1);
  const term2Due = shiftMonth(today, 1);

  const heads = await manager.save(HEADS.map((head) => manager.create(FeeHead, { ...head, school_id: schoolId })));
  const [tuition, books] = heads;
  const classes: { id: number; grade_level: number }[] = await manager.query(
    `SELECT DISTINCT c.id, c.grade_level FROM classes c
     JOIN student_enrollments e ON e.class_id = c.id AND e.academic_year_id = $2 AND e.status = 'studying'
     JOIN students s ON s.id = e.student_id AND s.deleted_at IS NULL AND s.status = 'active'
     WHERE c.school_id = $1 AND c.deleted_at IS NULL`,
    [schoolId, year.id],
  );
  const plans: FeePlan[] = [];
  for (const row of classes) {
    const tuitionAmount = 9000 + Math.max(Number(row.grade_level), 0) * 500;
    const lines: [FeeHead, string, number, string][] = [
      [tuition!, 'Term 1', tuitionAmount, term1Due],
      [books!, 'Term 1', 1800 + Math.max(Number(row.grade_level), 0) * 100, term1Due],
      [tuition!, 'Term 2', tuitionAmount, term2Due],
    ];
    for (const [head, installment, amount, dueDate] of lines) {
      plans.push(
        manager.create(FeePlan, {
          school_id: schoolId,
          academic_year_id: year.id,
          class_id: Number(row.id),
          fee_head_id: head.id,
          installment,
          amount,
          due_date: dueDate,
        }),
      );
    }
  }
  await manager.save(plans);

  const term1 = await generateInvoices(manager, { school_id: schoolId, year, installment: 'Term 1', created_by: null });
  const term2 = await generateInvoices(manager, { school_id: schoolId, year, installment: 'Term 2', created_by: null });
  const [office] = await manager.query(`SELECT id FROM users WHERE mobile = '9000000002' AND deleted_at IS NULL`);
  const receivedBy = office ? Number(office.id) : null;
  const term2ByStudent = new Map(term2.created.map((invoice) => [invoice.student_id, invoice]));

  let payments = 0;
  const pay = async (invoice: FeeInvoice, amount: number, paidOn: string, index: number) => {
    await recordPayment(manager, schoolId, invoice.id, {
      amount: round2(amount),
      mode: MODES[index % MODES.length]!,
      reference: MODES[index % MODES.length] === 'cash' ? null : `REF${String(100000 + invoice.id * 7 + index)}`,
      paid_on: paidOn < year.start_date ? year.start_date : paidOn,
      notes: null,
      received_by: receivedBy,
    });
    payments += 1;
  };

  for (const [index, first] of term1.created.entries()) {
    const second = term2ByStudent.get(first.student_id);
    const plan = index % 6;
    if (plan === 0) {
      await pay(first, first.total, addDays(term1Due, -12), index);
      if (second) await pay(second, second.total, addDays(today, -3), index + 1);
    } else if (plan === 1) {
      await pay(first, first.total, addDays(term1Due, -5), index);
    } else if (plan === 3) {
      await pay(first, Math.round(first.total * 0.6), addDays(term1Due, 4), index);
    } else if (plan === 4) {
      await pay(first, first.total, addDays(term1Due, -2), index);
      if (second) await pay(second, Math.round(second.total / 2), today, index + 1);
    } else if (plan === 5) {
      await manager.update(FeeInvoice, first.id, {
        status: 'cancelled',
        balance: 0,
        cancelled_at: new Date(),
        cancel_reason: 'Joined after Term 1',
      });
    }
    if (index === 2) {
      const discount = 1000;
      await manager.update(FeeInvoice, first.id, {
        ...applyDiscount({ gross: first.gross, paid: 0, status: first.status }, discount),
        discount,
        discount_reason: 'Sibling concession',
      });
    }
  }
  console.log(
    `Fees      ${heads.length} heads, ${plans.length} plan lines, ${term1.created.length + term2.created.length} invoices, ${payments} payments`,
  );
}
