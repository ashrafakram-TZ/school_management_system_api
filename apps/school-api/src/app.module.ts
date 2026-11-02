import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { mqttConfig, TelematicsModule } from '@app/telematics';
import { ALL_CONFIGS } from './config/configuration';
import { validate } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AccessModule } from './modules/access/access.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './modules/auth/guards/permissions.guard';
import { FilesModule } from './modules/files/files.module';
import { HealthModule } from './modules/health/health.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { SetupModule } from './modules/setup/setup.module';
import { SmsModule } from './modules/sms/sms.module';
import { StudentsModule } from './modules/students/students.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate, load: [...ALL_CONFIGS, mqttConfig] }),
    DatabaseModule,
    TelematicsModule,
    HealthModule,
    SmsModule,
    SchoolsModule,
    SetupModule,
    StudentsModule,
    AccessModule,
    UsersModule,
    AuthModule,
    NotificationsModule,
    FilesModule,
    JobsModule,
  ],
  providers: [
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useExisting: PermissionsGuard },
  ],
})
export class AppModule {}
