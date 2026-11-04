import { Inject, Injectable } from '@nestjs/common';
import { RtcRole, RtcTokenBuilder } from 'agora-token';
import { AppException } from '@app/common';
import { videoConfig, VideoConfig } from '../../config/configuration';

export interface AgoraJoinToken {
  app_id: string;
  token: string;
  expires_at: Date;
}

@Injectable()
export class AgoraTokenService {
  constructor(@Inject(videoConfig.KEY) private readonly video: VideoConfig) {}

  get enabled(): boolean {
    return Boolean(this.video.agoraAppId && this.video.agoraAppCertificate);
  }

  issue(channel: string, uid: number, validUntil: Date, now = new Date()): AgoraJoinToken {
    if (!this.enabled) {
      throw AppException.unavailable(
        'Video calls are not set up yet. Ask the office to add the Agora keys.',
        'VIDEO_NOT_CONFIGURED',
      );
    }
    const seconds = Math.min(
      this.video.tokenTtlSeconds,
      Math.max(60, Math.ceil((validUntil.getTime() - now.getTime()) / 1000)),
    );
    const token = RtcTokenBuilder.buildTokenWithUid(
      this.video.agoraAppId,
      this.video.agoraAppCertificate,
      channel,
      uid,
      RtcRole.PUBLISHER,
      seconds,
      seconds,
    );
    return {
      app_id: this.video.agoraAppId,
      token,
      expires_at: new Date(now.getTime() + seconds * 1000),
    };
  }
}
