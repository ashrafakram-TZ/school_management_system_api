import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppException } from '@app/common';
import { telematicsConfig, TelematicsConfig } from '../../config/configuration';

interface Envelope<T> {
  status: number;
  message: string;
  data: T;
  error?: string;
}

@Injectable()
export class TelematicsClient {
  private readonly logger = new Logger('Telematics');

  constructor(@Inject(telematicsConfig.KEY) private readonly config: TelematicsConfig) {}

  async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, value]) => value !== undefined && value !== '')
        .map(([key, value]): [string, string] => [key, String(value)]),
    ).toString();
    const url = `${this.config.url}${path}${query ? `?${query}` : ''}`;
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { 'x-api-key': this.config.apiKey, accept: 'application/json' },
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error) {
      this.logger.warn(`GET ${path} failed: ${(error as Error).message}`);
      throw AppException.unavailable(
        'Bus tracking is not reachable right now. Try again in a minute.',
        'TELEMATICS_UNAVAILABLE',
      );
    }
    const body = (await response.json().catch(() => null)) as Envelope<T> | null;
    if (response.status === 404) {
      throw AppException.notFound(body?.message ?? 'Vehicle not found', body?.error ?? 'VEHICLE_NOT_FOUND');
    }
    if (!response.ok || !body) {
      this.logger.warn(`GET ${path} returned ${response.status} ${body?.error ?? ''}`);
      throw AppException.unavailable(
        'Bus tracking is not reachable right now. Try again in a minute.',
        'TELEMATICS_UNAVAILABLE',
      );
    }
    return body.data;
  }

  async post<T>(path: string, payload: object): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.config.url}${path}`, {
        method: 'POST',
        headers: { 'x-api-key': this.config.apiKey, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error) {
      this.logger.warn(`POST ${path} failed: ${(error as Error).message}`);
      throw AppException.unavailable(
        'Bus tracking is not reachable right now. Try again in a minute.',
        'TELEMATICS_UNAVAILABLE',
      );
    }
    const body = (await response.json().catch(() => null)) as Envelope<T> | null;
    if (response.ok && body) return body.data;
    if (response.status === 404) {
      throw AppException.notFound(body?.message ?? 'Not found in bus tracking', body?.error ?? 'TELEMATICS_NOT_FOUND');
    }
    if (response.status === 409 || response.status === 400) {
      throw new AppException(
        response.status,
        body?.message ?? 'Bus tracking refused the request',
        body?.error ?? 'TELEMATICS_REJECTED',
      );
    }
    this.logger.warn(`POST ${path} returned ${response.status} ${body?.error ?? ''}`);
    throw AppException.unavailable(
      'Bus tracking is not reachable right now. Try again in a minute.',
      'TELEMATICS_UNAVAILABLE',
    );
  }

  async reachable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.url.replace(/\/v1$/, '')}/health`, {
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
