import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import type { Provider } from '@nestjs/common';

export const R2_CLIENT = Symbol('R2_CLIENT');

// R2 is S3-compatible - the AWS SDK's S3Client just needs a different
// endpoint/region, not a different client library.
export const r2ClientProvider: Provider = {
  provide: R2_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService) =>
    new S3Client({
      region: 'auto',
      endpoint: `https://${config.get<string>('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.get<string>('R2_ACCESS_KEY_ID')!,
        secretAccessKey: config.get<string>('R2_SECRET_ACCESS_KEY')!,
      },
    }),
};
