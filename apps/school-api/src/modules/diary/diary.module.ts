import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffModule } from '../staff/staff.module';
import { DiaryController } from './diary.controller';
import { DiaryService } from './diary.service';
import { DiaryAttachment } from './entities/diary-attachment.entity';
import { DiaryEntry } from './entities/diary-entry.entity';
import { DiaryRecipient } from './entities/diary-recipient.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DiaryEntry, DiaryRecipient, DiaryAttachment]), StaffModule],
  controllers: [DiaryController],
  providers: [DiaryService],
  exports: [DiaryService],
})
export class DiaryModule {}
