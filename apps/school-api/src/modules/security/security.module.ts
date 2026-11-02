import { Global, Module } from '@nestjs/common';
import { securityConfig, SecurityConfig } from '../../config/configuration';
import { FieldCipher } from './field-cipher';
import { QrTokens } from './qr-tokens';

@Global()
@Module({
  providers: [
    {
      provide: FieldCipher,
      inject: [securityConfig.KEY],
      useFactory: (settings: SecurityConfig) => new FieldCipher(settings.dataEncryptionKey),
    },
    {
      provide: QrTokens,
      inject: [securityConfig.KEY],
      useFactory: (settings: SecurityConfig) => new QrTokens(settings.qrSigningSecret),
    },
  ],
  exports: [FieldCipher, QrTokens],
})
export class SecurityModule {}
