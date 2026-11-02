import { Inject, Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { queueConfig, QueueConfig } from '../../../config/configuration';

export interface JobHandler<T> {
  run(payload: T, attempt: number): Promise<void>;
  failed?(payload: T, error: Error): Promise<void>;
}

export const JOB_QUEUE = Symbol('JOB_QUEUE');

export interface JobQueue {
  register<T>(name: string, handler: JobHandler<T>): void;
  add<T>(name: string, payload: T): void;
  idle(): Promise<void>;
}

@Injectable()
export class MemoryJobQueue implements JobQueue, OnApplicationShutdown {
  private readonly logger = new Logger('Queue');
  private readonly handlers = new Map<string, JobHandler<unknown>>();
  private readonly running = new Set<Promise<void>>();
  private closed = false;

  constructor(@Inject(queueConfig.KEY) private readonly config: QueueConfig) {}

  register<T>(name: string, handler: JobHandler<T>): void {
    this.handlers.set(name, handler as JobHandler<unknown>);
  }

  add<T>(name: string, payload: T): void {
    const handler = this.handlers.get(name);
    if (!handler) throw new Error(`No handler registered for job ${name}`);
    if (this.closed) {
      this.logger.warn(`Queue closed; dropped ${name}`);
      return;
    }
    this.track(this.process(name, handler, payload, 1));
  }

  async idle(): Promise<void> {
    while (this.running.size) await Promise.allSettled([...this.running]);
  }

  async onApplicationShutdown(): Promise<void> {
    this.closed = true;
    await this.idle();
  }

  private track(job: Promise<void>): void {
    this.running.add(job);
    void job.finally(() => this.running.delete(job));
  }

  private async process(name: string, handler: JobHandler<unknown>, payload: unknown, attempt: number): Promise<void> {
    await new Promise((resolve) => setImmediate(resolve));
    try {
      await handler.run(payload, attempt);
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      if (attempt <= this.config.maxRetries && !this.closed) {
        const delay = 1000 * 2 ** (attempt - 1);
        this.logger.warn(`${name} attempt ${attempt} failed: ${failure.message}. Retrying in ${delay} ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.process(name, handler, payload, attempt + 1);
      }
      this.logger.error(`${name} failed after ${attempt} attempts: ${failure.message}`);
      await handler.failed?.(payload, failure).catch((reason: Error) => this.logger.error(reason.message));
    }
  }
}
