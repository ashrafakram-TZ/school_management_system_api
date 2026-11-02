import { Logger } from '@nestjs/common';
import { QueueConfig } from '../../../config/configuration';
import { MemoryJobQueue } from './job-queue';

describe('MemoryJobQueue', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  it('runs a job once when it succeeds', async () => {
    const queue = new MemoryJobQueue({ driver: 'memory', maxRetries: 2 } as QueueConfig);
    const run = jest.fn().mockResolvedValue(undefined);
    queue.register('job', { run });
    queue.add('job', { id: 1 });
    await queue.idle();
    expect(run).toHaveBeenCalledWith({ id: 1 }, 1);
  });

  it('retries and then reports failure', async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    const queue = new MemoryJobQueue({ driver: 'memory', maxRetries: 1 } as QueueConfig);
    const run = jest.fn().mockRejectedValue(new Error('down'));
    const failed = jest.fn().mockResolvedValue(undefined);
    queue.register('job', { run, failed });
    queue.add('job', { id: 2 });
    await jest.advanceTimersByTimeAsync(5_000);
    await queue.idle();
    jest.useRealTimers();
    expect(run).toHaveBeenCalledTimes(2);
    expect(failed).toHaveBeenCalledWith({ id: 2 }, expect.any(Error));
  });

  it('refuses jobs without a handler', () => {
    const queue = new MemoryJobQueue({ driver: 'memory', maxRetries: 0 } as QueueConfig);
    expect(() => queue.add('missing', {})).toThrow('No handler registered for job missing');
  });
});
