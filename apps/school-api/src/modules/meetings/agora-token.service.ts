import { createHmac, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { RtcRole, RtcTokenBuilder } from 'agora-token';
import { AppException } from '@app/common';
import { videoConfig, VideoConfig } from '../../config/configuration';

export interface AgoraJoinToken {
  app_id: string;
  token: string;
  expires_at: Date;
}

export interface KickResult {
  ok: boolean;
  rule_id: string | null;
  reason?: string;
}

export const CHANNEL_BAN_MINUTES = 1440;

export function agoraSignatureValid(rawBody: Buffer | string, header: string | undefined, secret: string): boolean {
  if (!header || !secret) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const given = Buffer.from(header.trim().toLowerCase());
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

@Injectable()
export class AgoraTokenService {
  private readonly logger = new Logger('Agora');

  constructor(@Inject(videoConfig.KEY) private readonly video: VideoConfig) {}

  get enabled(): boolean {
    return Boolean(this.video.agoraAppId && this.video.agoraAppCertificate);
  }

  get canRemoveParticipants(): boolean {
    return Boolean(this.enabled && this.video.customerId && this.video.customerSecret);
  }

  get webhookSecret(): string {
    return this.video.webhookSecret;
  }

  issue(channel: string, uid: number, now = new Date()): AgoraJoinToken {
    if (!this.enabled) {
      throw AppException.unavailable(
        'Video calls are not set up yet. Ask the office to add the Agora keys.',
        'VIDEO_NOT_CONFIGURED',
      );
    }
    const seconds = this.video.tokenTtlSeconds;
    const token = RtcTokenBuilder.buildTokenWithUid(
      this.video.agoraAppId,
      this.video.agoraAppCertificate,
      channel,
      uid,
      RtcRole.PUBLISHER,
      seconds,
      seconds,
    );
    return { app_id: this.video.agoraAppId, token, expires_at: new Date(now.getTime() + seconds * 1000) };
  }

  async endChannel(channel: string): Promise<KickResult> {
    if (!this.canRemoveParticipants) {
      return { ok: false, rule_id: null, reason: 'AGORA_CUSTOMER_ID and AGORA_CUSTOMER_SECRET are not set' };
    }
    const credentials = Buffer.from(`${this.video.customerId}:${this.video.customerSecret}`).toString('base64');
    try {
      const response = await fetch(`${this.video.restUrl}/dev/v1/kicking-rule`, {
        method: 'POST',
        headers: { authorization: `Basic ${credentials}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          appid: this.video.agoraAppId,
          cname: channel,
          time: CHANNEL_BAN_MINUTES,
          privileges: ['join_channel'],
        }),
        signal: AbortSignal.timeout(this.video.timeoutMs),
      });
      const body = (await response.json().catch(() => ({}))) as { status?: string; id?: number; message?: string };
      if (!response.ok || body.status !== 'success') {
        const reason = `HTTP ${response.status} ${body.message ?? body.status ?? ''}`.trim();
        this.logger.warn(`Could not end channel ${channel}: ${reason}`);
        return { ok: false, rule_id: null, reason };
      }
      return { ok: true, rule_id: body.id ? String(body.id) : null };
    } catch (error) {
      const reason = (error as Error).message;
      this.logger.warn(`Could not end channel ${channel}: ${reason}`);
      return { ok: false, rule_id: null, reason };
    }
  }
}
