import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppBannersController } from './app-banners.controller';
import { AppBannersService } from './app-banners.service';
import { AppBanner } from './entities/app-banner.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AppBanner])],
  controllers: [AppBannersController],
  providers: [AppBannersService],
  exports: [AppBannersService],
})
export class AppBannersModule {}
