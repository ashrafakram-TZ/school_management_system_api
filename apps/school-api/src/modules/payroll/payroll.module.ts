import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollRun } from './entities/payroll-run.entity';
import { Payslip } from './entities/payslip.entity';
import { SalaryStructure } from './entities/salary-structure.entity';
import { MobileTeacherPayslipsController, MyPayslipsController, PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';

@Module({
  imports: [TypeOrmModule.forFeature([SalaryStructure, PayrollRun, Payslip])],
  controllers: [PayrollController, MyPayslipsController, MobileTeacherPayslipsController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
