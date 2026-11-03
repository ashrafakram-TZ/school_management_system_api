import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { CLIENT_APPS, ClientApp } from '../../access/entities/role.entity';
import { IsMobile } from '../../../shared/mobile';
import { Platform, PLATFORMS } from '../../users/entities/user-device.entity';
import { UserProfileDto } from '../../users/dto/user-response.dto';

export class RequestOtpDto {
  @IsMobile()
  mobile: string;

  @ApiPropertyOptional({
    example: 'FA+9qCX9VSu',
    description: 'Android SMS Retriever app hash, appended to the SMS so the app can read the OTP automatically',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  app_signature?: string;

  @ApiPropertyOptional({
    enum: CLIENT_APPS,
    example: 'mobile',
    description:
      'Which app is asking. Send it so a number without access to that app gets 403 APP_NOT_ALLOWED before any SMS is sent.',
  })
  @IsOptional()
  @IsIn(CLIENT_APPS)
  app?: ClientApp;
}

export class ClientInfoDto {
  @ApiProperty({
    enum: CLIENT_APPS,
    example: 'mobile',
    description:
      'mobile = the Flutter app (Parent, Staff and Driver in one app); admin = the admin web. Sign-in is refused with 403 APP_NOT_ALLOWED when the user has no role for that app.',
  })
  @IsIn(CLIENT_APPS, { message: 'client.app must be mobile or admin' })
  app: ClientApp;

  @ApiPropertyOptional({ enum: PLATFORMS, example: 'android' })
  @IsOptional()
  @IsIn(PLATFORMS)
  platform?: Platform;

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

  @ApiPropertyOptional({
    example: 'fcm-token-from-firebase-messaging',
    description: 'Pass it here to register push in the same call',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  fcm_token?: string;
}

export class VerifyOtpDto {
  @IsMobile()
  mobile: string;

  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/, { message: 'otp must be 6 digits' })
  otp: string;

  @ApiProperty({ type: ClientInfoDto })
  @IsNotEmpty({
    message: 'client is required: send { "app": "mobile" } from the Flutter app or { "app": "admin" } from the web',
  })
  @ValidateNested()
  @Type(() => ClientInfoDto)
  client: ClientInfoDto;
}

export class RefreshTokenDto {
  @ApiProperty({ example: '15.Yk3m9...' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  refresh_token: string;
}

export class OtpSentDto {
  @ApiProperty({ example: '98******10' })
  mobile_masked: string;

  @ApiProperty({ example: 600, description: 'Seconds until the OTP expires' })
  expires_in: number;

  @ApiProperty({ example: 30, description: 'Seconds before the user may request another OTP' })
  resend_in: number;

  @ApiProperty({ example: 6 })
  otp_length: number;
}

export class TokenPairDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token: string;

  @ApiProperty({ example: '15.Yk3m9...' })
  refresh_token: string;

  @ApiProperty({ example: 'Bearer' })
  token_type: 'Bearer';

  @ApiProperty({ example: 3600, description: 'Seconds until the access token expires' })
  expires_in: number;

  @ApiProperty({ example: '2026-12-02T10:00:00.000+05:30' })
  refresh_expires_at: Date;
}

export class LoginResponseDto extends TokenPairDto {
  @ApiProperty({ type: UserProfileDto })
  user: UserProfileDto;
}
