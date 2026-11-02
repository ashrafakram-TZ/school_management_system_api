import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NumberSequence } from './entities/number-sequence.entity';
import { School } from './entities/school.entity';
import { CurrentSchoolController, PlatformSchoolsController } from './schools.controller';
import { SchoolsService } from './schools.service';
import { SequencesService } from './sequences.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([School, NumberSequence])],
  controllers: [PlatformSchoolsController, CurrentSchoolController],
  providers: [SchoolsService, SequencesService],
  exports: [TypeOrmModule, SchoolsService, SequencesService],
})
export class SchoolsModule {}
