import { INestApplication, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AllExceptionsFilter, createValidationPipe, requestContextMiddleware, ResponseInterceptor } from '@app/common';
import { AppConfig } from './config/configuration';

export const API_PREFIX = 'api';
export const DEFAULT_VERSION = '1';

export function setupApp(app: INestApplication): void {
  app.use(requestContextMiddleware);
  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: DEFAULT_VERSION });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new ResponseInterceptor(app.get(Reflector), app.get(ConfigService).getOrThrow<AppConfig>('app').timeZone),
  );
}
