import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnouncementsController, MyAnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import {
  Announcement,
  AnnouncementAttachment,
  AnnouncementRecipient,
  AnnouncementTarget,
} from './entities/announcement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Announcement, AnnouncementTarget, AnnouncementRecipient, AnnouncementAttachment]),
  ],
  controllers: [AnnouncementsController, MyAnnouncementsController],
  providers: [AnnouncementsService],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
