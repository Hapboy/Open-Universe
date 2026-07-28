const NODE_ENVS = ['development', 'production', 'test'] as const;

const REQUIRED_STRING_VARS = [
  'DATABASE_URL',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
] as const;

// Extend this as each module introduces its own required var (REDIS_URL and
// a JWT secret once CollaborationModule/AuthModule are built — see
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
