import { Body, Controller, Delete, Get, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, AuthUser, CurrentUser, RequirePermissions, ResponseMessage } from '@app/common';
import { ApiSchoolHeader, SchoolId } from '../../shared/school-context';
import { PERMISSIONS } from '../access/access.catalog';
import { AppBannersService } from './app-banners.service';
import {
  AppBannerDto,
  AppBannerInputDto,
  AppBannerInsightsDto,
  AppBannerQueryDto,
  UpdateAppBannerDto,
} from './dto/app-banner.dto';

@ApiTags('Admin · App banners')
@ApiBearerAuth()
@ApiSchoolHeader()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
@Controller('admin/app-banners')
export class AppBannersController {
  constructor(private readonly banners: AppBannersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS_VIEW)
  @ApiOperation({ summary: 'Image banners for the app home screens, with state (live, scheduled, ended, paused)' })
  @ApiEnvelope(AppBannerDto, { paginated: true })
  @ApiErrors(HttpStatus.BAD_REQUEST)
  list(@SchoolId() schoolId: number, @Query() query: AppBannerQueryDto) {
    return this.banners.list(schoolId, query);
  }

  @Get('insights')
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS_VIEW)
  @ApiOperation({ summary: 'Counts for the insight cards: live, scheduled, ended, paused' })
  @ApiEnvelope(AppBannerInsightsDto)
  insights(@SchoolId() schoolId: number) {
    return this.banners.insights(schoolId);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS_VIEW)
  @ApiOperation({ summary: 'One banner' })
  @ApiEnvelope(AppBannerDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  get(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number) {
    return this.banners.get(schoolId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS_SEND)
  @ResponseMessage('Banner added')
  @ApiOperation({
    summary: 'Add an image banner shown on the Staff app, Parent app or both between two dates',
    description:
      'The image is optional: upload it first with POST /files (purpose app_banner); a wide image (about 3:1) looks best. Without an image the app shows a text banner.',
  })
  @ApiEnvelope(AppBannerDto, { status: HttpStatus.CREATED, message: 'Banner added' })
  @ApiErrors(HttpStatus.BAD_REQUEST)
  create(@SchoolId() schoolId: number, @Body() dto: AppBannerInputDto, @CurrentUser() actor: AuthUser) {
    return this.banners.create(schoolId, dto, actor);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS_SEND)
  @ResponseMessage('Banner saved')
  @ApiOperation({ summary: 'Edit a banner, or pause it with is_active false' })
  @ApiEnvelope(AppBannerDto, { message: 'Banner saved' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  update(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAppBannerDto) {
    return this.banners.update(schoolId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS_SEND)
  @ResponseMessage('Banner removed')
  @ApiOperation({ summary: 'Remove a banner' })
  @ApiErrors(HttpStatus.NOT_FOUND)
  async remove(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number) {
    await this.banners.remove(schoolId, id);
    return null;
  }
}
