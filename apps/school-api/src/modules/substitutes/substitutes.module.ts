import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimetableModule } from '../timetable/timetable.module';
import { Substitution } from './entities/substitution.entity';
import { SubstitutesController } from './substitutes.controller';
import { SubstitutesService } from './substitutes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Substitution]), TimetableModule],
  controllers: [SubstitutesController],
  providers: [SubstitutesService],
  exports: [SubstitutesService],
})
export class SubstitutesModule {}
