import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeeHead } from './entities/fee-head.entity';
import { FeeInvoiceLine } from './entities/fee-invoice-line.entity';
import { FeeInvoice } from './entities/fee-invoice.entity';
import { FeePayment } from './entities/fee-payment.entity';
import { FeePlan } from './entities/fee-plan.entity';
import { MobileParentFeesController, MobileTeacherFeesController } from './fees-mobile.controller';
import { FeesController, StudentFeesController } from './fees.controller';
import { FeesService } from './fees.service';

@Module({
  imports: [TypeOrmModule.forFeature([FeeHead, FeePlan, FeeInvoice, FeeInvoiceLine, FeePayment])],
  controllers: [FeesController, StudentFeesController, MobileTeacherFeesController, MobileParentFeesController],
  providers: [FeesService],
  exports: [FeesService],
})
export class FeesModule {}
