import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { APP_SECTIONS, AppSection } from '../../access/entities/role.entity';
import { Platform, PLATFORMS } from '../entities/user-device.entity';

export class RegisterDeviceDto {
  @ApiProperty({
    example: 'fcm-token-from-firebase-messaging',
    description: 'Firebase Cloud Messaging registration token',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  fcm_token: string;

  @ApiProperty({ enum: PLATFORMS, example: 'android' })
  @IsIn(PLATFORMS)
  platform: Platform;

  @ApiPropertyOptional({
    enum: APP_SECTIONS,
    example: 'parent',
    description: 'Which app section is open on this device',
  })
  @IsOptional()
  @IsIn(APP_SECTIONS)
  app?: AppSection;

  @ApiPropertyOptional({ example: 'Pixel 7' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  device_name?: string;

  @ApiPropertyOptional({ example: '1.0.0+12' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  app_version?: string;
}

export class RemoveDeviceDto {
  @ApiProperty({ example: 'fcm-token-from-firebase-messaging' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  fcm_token: string;
}
