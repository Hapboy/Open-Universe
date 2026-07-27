const NODE_ENVS = ['development', 'production', 'test'] as const;

// Extend this as each module introduces its own required var (DATABASE_URL/
// REDIS_URL in Phase E, a JWT secret in Phase G, R2 credentials in Phase H —
// see docs/backend-bootstrap.md). Nothing is required yet since apps/api has
// no functionality beyond /health.
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
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
