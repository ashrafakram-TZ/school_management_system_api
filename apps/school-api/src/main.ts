import 'dotenv/config';
import { networkInterfaces } from 'os';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';
import { AppConfig } from './config/configuration';
import { setupSwagger } from './swagger';

function reachableHosts(host: string): string[] {
  if (host !== '::' && host !== '0.0.0.0') return [host];
  const lan = Object.values(networkInterfaces())
    .flatMap((nets) => nets ?? [])
    .filter((net) => net.family === 'IPv4' && !net.internal)
    .map((net) => net.address);
  return ['localhost', ...lan];
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  const logger = new Logger('Bootstrap');
  const config = app.get(ConfigService);
  const appCfg = config.getOrThrow<AppConfig>('app');

  app.set('trust proxy', 1);
  setupApp(app);
  app.enableCors({
    origin: appCfg.corsOrigins.length ? appCfg.corsOrigins : appCfg.env !== 'production',
    exposedHeaders: ['X-Request-Id'],
  });
  app.enableShutdownHooks();

  if (appCfg.env !== 'production') setupSwagger(app);

  await app.listen(appCfg.port, appCfg.host);
  for (const host of reachableHosts(appCfg.host)) {
    logger.log(`HTTP listening on http://${host}:${appCfg.port}/api/v1`);
  }
  if (appCfg.env !== 'production')
    logger.log(
      `Swagger: admin http://localhost:${appCfg.port}/api/docs/admin · mobile http://localhost:${appCfg.port}/api/docs/mobile`,
    );
}

void bootstrap();
