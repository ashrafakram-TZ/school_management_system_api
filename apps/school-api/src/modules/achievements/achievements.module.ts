import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AchievementsController, SchoolAchievementsController } from './achievements.controller';
import { AchievementsService } from './achievements.service';
import { StudentAchievement } from './entities/student-achievement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StudentAchievement])],
  controllers: [AchievementsController, SchoolAchievementsController],
  providers: [AchievementsService],
  exports: [AchievementsService],
})
export class AchievementsModule {}
