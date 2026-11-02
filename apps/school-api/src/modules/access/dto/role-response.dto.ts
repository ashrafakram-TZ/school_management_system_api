import { ApiProperty } from '@nestjs/swagger';
import { APP_SECTIONS, AppSection } from '../entities/role.entity';

export class PermissionDto {
  @ApiProperty({ example: 'users.manage' })
  code: string;

  @ApiProperty({ example: 'Add, edit, deactivate users and assign roles' })
  name: string;

  @ApiProperty({ example: 'Users' })
  group_name: string;
}

export class RoleDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ example: 'AO' })
  code: string;

  @ApiProperty({ example: 'Administrative officer' })
  name: string;

  @ApiProperty({ example: 'Runs the school office', nullable: true, type: String })
  description: string | null;

  @ApiProperty({ enum: APP_SECTIONS, example: 'admin' })
  app: AppSection;

  @ApiProperty({ example: 4 })
  user_count: number;

  @ApiProperty({ type: [String], example: ['users.view', 'users.manage'] })
  permissions: string[];
}
