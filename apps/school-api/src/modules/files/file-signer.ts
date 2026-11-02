import { hmac, safeEqual } from '../../shared/crypto';

export type FileVariant = 'original' | 'thumb';

export interface SignedQuery {
  variant: FileVariant;
  expires: number;
  signature: string;
}

export class FileSigner {
  constructor(
    private readonly secret: string,
    private readonly ttlSeconds: number,
  ) {}

  sign(fileId: number, variant: FileVariant, now = Date.now()): SignedQuery {
    const expires = Math.floor(now / 1000) + this.ttlSeconds;
    return { variant, expires, signature: this.signature(fileId, variant, expires) };
  }

  verify(fileId: number, query: SignedQuery, now = Date.now()): boolean {
    if (!Number.isInteger(query.expires) || query.expires < Math.floor(now / 1000)) return false;
    return safeEqual(this.signature(fileId, query.variant, query.expires), query.signature);
  }

  private signature(fileId: number, variant: FileVariant, expires: number): string {
    return hmac(this.secret, `file:${fileId}:${variant}:${expires}`);
  }
}
