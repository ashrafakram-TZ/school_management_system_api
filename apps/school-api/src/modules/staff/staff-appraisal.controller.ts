import { Body, Controller, Get, HttpStatus, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, AuthUser, CurrentUser, RequirePermissions, ResponseMessage } from '@app/common';
import { ApiSchoolHeader, SchoolId } from '../../shared/school-context';
import { PERMISSIONS } from '../access/access.catalog';
import { AppraisalsService } from './appraisals.service';
import { AppraisalQueryDto, StaffAppraisalDto, StaffAppraisalInputDto } from './dto/staff-appraisal.dto';

@ApiTags('Admin · Staff')
@ApiBearerAuth()
@ApiSchoolHeader()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
@Controller('admin/staff-appraisals')
export class StaffAppraisalController {
  constructor(private readonly appraisals: AppraisalsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.STAFF_VIEW)
  @ApiOperation({
    summary: 'List staff appraisals with ratings, scores, and status filters',
  })
  @ApiEnvelope(StaffAppraisalDto, { paginated: true })
  list(@SchoolId() schoolId: number, @Query() query: AppraisalQueryDto) {
    return this.appraisals.list(schoolId, query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.STAFF_VIEW)
  @ApiOperation({ summary: 'Get details of a single staff performance review' })
  @ApiEnvelope(StaffAppraisalDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  get(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number) {
    return this.appraisals.get(schoolId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.STAFF_MANAGE)
  @ResponseMessage('Staff appraisal created')
  @ApiOperation({ summary: 'Conduct and save a new staff performance review (draft)' })
  @ApiEnvelope(StaffAppraisalDto, { status: HttpStatus.CREATED, message: 'Staff appraisal created' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  create(@SchoolId() schoolId: number, @CurrentUser() user: AuthUser, @Body() dto: StaffAppraisalInputDto) {
    return this.appraisals.create(schoolId, user, dto);
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.STAFF_MANAGE)
  @ResponseMessage('Staff appraisal updated')
  @ApiOperation({ summary: 'Update scores or feedback on a draft staff performance review' })
  @ApiEnvelope(StaffAppraisalDto, { message: 'Staff appraisal updated' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  update(@SchoolId() schoolId: number, @Param('id', ParseIntPipe) id: number, @Body() dto: StaffAppraisalInputDto) {
    return this.appraisals.update(schoolId, id, dto);
  }

  @Post(':id/finalize')
  @RequirePermissions(PERMISSIONS.STAFF_MANAGE)
  @ResponseMessage('Staff appraisal finalized and published to staff')
  @ApiOperation({ summary: 'Finalize and publish the appraisal to the teacher mobile app' })
  @ApiEnvelope(StaffAppraisalDto, { message: 'Staff appraisal finalized and published to staff' })
  @ApiErrors(HttpStatus.NOT_FOUND)
  finalize(@SchoolId() schoolId: number, @CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.appraisals.finalize(schoolId, id, user);
  }
}
