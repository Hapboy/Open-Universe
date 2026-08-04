const NODE_ENVS = ['development', 'production', 'test'] as const;

const REQUIRED_STRING_VARS = [
  'DATABASE_URL',
  'REDIS_URL',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
  'JWT_SECRET',
] as const;

// GEMINI_KEY (and the Pinterest OAuth vars, once that module exists) are
// deliberately not required here - those routes soft-fail with 501 when
// their credentials are unset, rather than refusing to boot. JWT_SECRET is
// different: AuthModule is core, not an optional integration, so a missing
// secret should fail fast at startup instead of 500ing on the first request.
//
// Extend this as each module introduces its own required var (see
// docs/backend-bootstrap.md and the reordered plan in DECISIONS.md).
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  for (const key of REQUIRED_STRING_VARS) {
    if (typeof config[key] !== 'string' || !config[key]) {
      throw new Error(`${key} is required`);
    }
  }

  const nodeEnv = config.NODE_ENV;
  if (
    nodeEnv !== undefined &&
    (typeof nodeEnv !== 'string' ||
      !NODE_ENVS.includes(nodeEnv as (typeof NODE_ENVS)[number]))
  ) {
    throw new Error(
      `NODE_ENV must be one of ${NODE_ENVS.join(', ')}, got ${JSON.stringify(nodeEnv)}`,
    );
  }

  const port = config.PORT;
  if (
    port !== undefined &&
    (typeof port !== 'string' || !/^\d+$/.test(port) || Number(port) <= 0)
  ) {
    throw new Error(
      `PORT must be a positive integer, got ${JSON.stringify(port)}`,
    );
  }

  return config;
}
