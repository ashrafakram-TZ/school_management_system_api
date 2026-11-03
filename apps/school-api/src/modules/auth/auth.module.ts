import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { authConfig, AuthConfig } from '../../config/configuration';
import { User } from '../users/entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CentralAuthClient } from './central-auth.client';
import { OtpRequest } from './entities/otp-request.entity';
import { UserSession } from './entities/user-session.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OtpRequest, UserSession, User]),
    JwtModule.registerAsync({
      inject: [authConfig.KEY],
      useFactory: (auth: AuthConfig) => ({
        secret: auth.accessSecret,
        signOptions: { expiresIn: auth.accessTtlSeconds },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, TokenService, CentralAuthClient, JwtAuthGuard, PermissionsGuard],
  exports: [TokenService, JwtAuthGuard, PermissionsGuard],
})
export class AuthModule {}
