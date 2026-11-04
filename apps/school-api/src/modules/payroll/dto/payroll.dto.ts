import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, Matches, Max, Min } from 'class-validator';
import { ListQueryDto, PaginationDto, toBoolean } from '@app/common';
import { IsDateOnly } from '../../../shared/dates';
import { RUN_STATUSES, RunStatus } from '../entities/payroll-run.entity';

const amount = () => {
  const decorators = [IsNumber({ maxDecimalPlaces: 2 }), Min(0), Max(10000000)];
  return (target: object, key: string) => decorators.forEach((decorator) => decorator(target, key));
};

export class SalaryStructureInputDto {
  @IsDateOnly('2026-06-01')
  effective_from: string;

  @ApiProperty({ example: 32000 })
  @amount()
  basic: number;

  @ApiPropertyOptional({ example: 6400, default: 0 })
  @IsOptional()
  @amount()
  da?: number;

  @ApiPropertyOptional({ example: 12800, default: 0 })
  @IsOptional()
  @amount()
  hra?: number;

  @ApiPropertyOptional({ example: 1600, default: 0 })
  @IsOptional()
  @amount()
  conveyance?: number;

  @ApiPropertyOptional({ example: 4000, default: 0 })
  @IsOptional()
  @amount()
  special_allowance?: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @amount()
  other_allowance?: number;

  @ApiPropertyOptional({ default: true, description: 'Employee PF at 12% of basic + DA, wage capped at 15,000' })
  @IsOptional()
  @IsBoolean()
  pf_enabled?: boolean;

  @ApiPropertyOptional({ default: false, description: 'Employee ESI at 0.75% when monthly gross is 21,000 or less' })
  @IsOptional()
  @IsBoolean()
  esi_enabled?: boolean;

  @ApiPropertyOptional({ example: 208, default: 0, description: 'Professional tax a month' })
  @IsOptional()
  @amount()
  professional_tax?: number;

  @ApiPropertyOptional({ example: 0, default: 0, description: 'Income tax deducted a month' })
  @IsOptional()
  @amount()
  tds?: number;

  @ApiPropertyOptional({ example: 0, default: 0, description: 'Salary advance or other recovery a month' })
  @IsOptional()
  @amount()
  other_deduction?: number;
}

export class SalaryQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ description: 'true: only staff with a salary; false: only staff still without one' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  has_structure?: boolean;
}

export class RunMonthDto {
  @ApiProperty({ example: '2026-10' })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month must look like 2026-10' })
  month: string;
}

export class RunQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: RUN_STATUSES })
  @IsOptional()
  @IsIn(RUN_STATUSES)
  status?: RunStatus;
}

export class SalaryStructureDto {
  @ApiProperty({ example: '2026-06-01' })
  effective_from: string;

  @ApiProperty({ example: 32000 })
  basic: number;

  @ApiProperty({ example: 6400 })
  da: number;

  @ApiProperty({ example: 12800 })
  hra: number;

  @ApiProperty({ example: 1600 })
  conveyance: number;

  @ApiProperty({ example: 4000 })
  special_allowance: number;

  @ApiProperty({ example: 0 })
  other_allowance: number;

  @ApiProperty()
  pf_enabled: boolean;

  @ApiProperty()
  esi_enabled: boolean;

  @ApiProperty({ example: 208 })
  professional_tax: number;

  @ApiProperty({ example: 0 })
  tds: number;

  @ApiProperty({ example: 0 })
  other_deduction: number;

  @ApiProperty({ example: 56800, description: 'Sum of earnings for a full month' })
  monthly_gross: number;

  @ApiProperty({ example: 4608, description: 'PF + ESI + PT + TDS + other for a full month' })
  monthly_deductions: number;

  @ApiProperty({ example: 52192 })
  monthly_net: number;
}

export class SalaryStaffDto {
  @ApiProperty({ example: 5 })
  user_id: number;

  @ApiProperty({ example: 'Priya Venkatesh' })
  name: string;

  @ApiProperty({ example: 'TZMS-EMP-0004' })
  employee_no: string;

  @ApiProperty({ example: 'PG Assistant' })
  designation: string;

  @ApiProperty({ nullable: true, type: String })
  department: string | null;

  @ApiProperty({ example: 'teaching' })
  staff_type: string;

  @ApiProperty({ type: SalaryStructureDto, nullable: true })
  structure: SalaryStructureDto | null;
}

export class PayrollRunDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ example: '2026-10' })
  month: string;

  @ApiProperty({ example: 'October 2026' })
  month_label: string;

  @ApiProperty({ enum: RUN_STATUSES })
  status: RunStatus;

  @ApiProperty({ example: 26 })
  working_days: number;

  @ApiProperty({ example: 13 })
  staff_count: number;

  @ApiProperty({ example: 512000 })
  total_gross: number;

  @ApiProperty({ example: 41200 })
  total_deductions: number;

  @ApiProperty({ example: 470800 })
  total_net: number;

  @ApiProperty({ nullable: true, type: Date })
  finalized_at: Date | null;

  @ApiProperty()
  created_at: Date;
}

export class PayslipDto {
  @ApiProperty({ example: 41 })
  id: number;

  @ApiProperty({ example: 3 })
  run_id: number;

  @ApiProperty({ example: '2026-10' })
  month: string;

  @ApiProperty({ example: 'October 2026' })
  month_label: string;

  @ApiProperty({ enum: RUN_STATUSES })
  status: RunStatus;

  @ApiProperty({ example: 5 })
  user_id: number;

  @ApiProperty({ example: 'TZMS-EMP-0004' })
  employee_no: string;

  @ApiProperty({ example: 'Priya Venkatesh' })
  name: string;

  @ApiProperty({ example: 'PG Assistant' })
  designation: string;

  @ApiProperty({ nullable: true, type: String })
  department: string | null;

  @ApiProperty({ nullable: true, type: String })
  bank_name: string | null;

  @ApiProperty({ nullable: true, type: String, example: '2345' })
  bank_account_last4: string | null;

  @ApiProperty({ example: 26 })
  working_days: number;

  @ApiProperty({ example: 1 })
  lop_days: number;

  @ApiProperty({ example: 25 })
  paid_days: number;

  @ApiProperty({ example: 30769.23 })
  basic: number;

  @ApiProperty()
  da: number;

  @ApiProperty()
  hra: number;

  @ApiProperty()
  conveyance: number;

  @ApiProperty()
  special_allowance: number;

  @ApiProperty()
  other_allowance: number;

  @ApiProperty({ example: 54615.38 })
  gross: number;

  @ApiProperty({ example: 1800 })
  pf: number;

  @ApiProperty({ example: 0 })
  esi: number;

  @ApiProperty({ example: 208 })
  professional_tax: number;

  @ApiProperty({ example: 0 })
  tds: number;

  @ApiProperty({ example: 0 })
  other_deduction: number;

  @ApiProperty({ example: 2008 })
  total_deductions: number;

  @ApiProperty({ example: 52607.38 })
  net: number;
}

export class MissingSalaryDto {
  @ApiProperty({ example: 9 })
  user_id: number;

  @ApiProperty({ example: 'Arun Prakash' })
  name: string;

  @ApiProperty({ example: 'TZMS-EMP-0007' })
  employee_no: string;
}

export class PayrollRunDetailDto extends PayrollRunDto {
  @ApiProperty({ type: [PayslipDto] })
  payslips: PayslipDto[];

  @ApiProperty({ type: [MissingSalaryDto], description: 'Active staff left out because they have no salary yet' })
  missing: MissingSalaryDto[];
}

export class MyPayslipQueryDto extends PaginationDto {
  @ApiPropertyOptional({ example: 2026, description: 'Only payslips of this year' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ example: 9, description: 'Only this month (1–12); with year for one exact month' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}

export class PayslipLineDto {
  @ApiProperty({ example: 'hra' })
  code: string;

  @ApiProperty({ example: 'House rent allowance (HRA)' })
  label: string;

  @ApiProperty({ example: 6000 })
  amount: number;
}

export class PayslipPreviewDto extends PayslipDto {
  @ApiProperty({ type: [PayslipLineDto], description: 'Earnings to show, zero lines left out (Basic always shown)' })
  earnings: PayslipLineDto[];

  @ApiProperty({ type: [PayslipLineDto], description: 'Deductions to show, zero lines left out' })
  deductions: PayslipLineDto[];

  @ApiProperty({
    example: '/api/v1/mobile/teacher/payslips/41/pdf',
    description: 'Download link for the PDF (send the same token)',
  })
  pdf_path: string;
}

export class PayslipMonthDto {
  @ApiProperty({ example: '2026-09' })
  month: string;

  @ApiProperty({ example: 9 })
  month_no: number;

  @ApiProperty({ example: 'September 2026' })
  label: string;

  @ApiProperty({ example: 41 })
  payslip_id: number;

  @ApiProperty({ example: 38250 })
  net: number;
}

export class PayslipYearDto {
  @ApiProperty({ example: 2026 })
  year: number;

  @ApiProperty({ example: 153000, description: 'Net pay of the listed months' })
  total_net: number;

  @ApiProperty({ type: [PayslipMonthDto], description: 'Newest month first' })
  months: PayslipMonthDto[];
}

export class PayslipPeriodsDto {
  @ApiProperty({
    type: [PayslipYearDto],
    description: 'Years and months that have a payslip, newest first; use for the year and month filters',
  })
  years: PayslipYearDto[];
}
