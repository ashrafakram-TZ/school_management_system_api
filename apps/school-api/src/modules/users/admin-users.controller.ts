import { Body, Controller, Delete, Get, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiErrors, AuthUser, CurrentUser, RequirePermissions, ResponseMessage } from '@app/common';
import { PERMISSIONS } from '../access/access.catalog';
import { CreateUserDto, UpdateUserDto, UserQueryDto } from './dto/user-input.dto';
import { UserInsightsDto, UserListItemDto, UserProfileDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Admin · Users')
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USERS_VIEW)
  @ApiOperation({
    summary: 'List users',
    description:
      'search matches name, mobile and email (every word must match). sort: created_at, name, last_login_at.',
  })
  @ApiEnvelope(UserListItemDto, { paginated: true })
  @ApiErrors(HttpStatus.BAD_REQUEST)
  list(@Query() query: UserQueryDto, @CurrentUser() actor: AuthUser) {
    return this.users.list(query, actor);
  }

  @Get('insights')
  @RequirePermissions(PERMISSIONS.USERS_VIEW)
  @ApiOperation({ summary: 'Counts for the users page insight cards' })
  @ApiEnvelope(UserInsightsDto)
  insights(@CurrentUser() actor: AuthUser) {
    return this.users.insights(actor);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.USERS_VIEW)
  @ApiOperation({ summary: 'Get one user with roles and permissions' })
  @ApiEnvelope(UserProfileDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  get(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthUser) {
    return this.users.get(id, actor);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  @ResponseMessage('User created')
  @ApiOperation({ summary: 'Create a user and assign roles' })
  @ApiEnvelope(UserProfileDto, { status: HttpStatus.CREATED, message: 'User created' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthUser) {
    return this.users.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  @ResponseMessage('User updated')
  @ApiOperation({
    summary: 'Update a user. role_codes replaces all roles. Deactivating signs the user out everywhere.',
  })
  @ApiEnvelope(UserProfileDto, { message: 'User updated' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto, @CurrentUser() actor: AuthUser) {
    return this.users.update(id, dto, actor);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  @ResponseMessage('User deleted')
  @ApiOperation({ summary: 'Delete a user and sign them out everywhere' })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthUser) {
    return this.users.remove(id, actor);
  }
}
