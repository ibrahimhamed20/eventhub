import "dotenv/config";

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),

  db: {
    host: required("PG_HOST", "127.0.0.1"),
    port: Number(required("PG_PORT", "5434")),
    user: required("PG_USER", "eventhub"),
    password: required("PG_PASSWORD", "eventhub"),
    database: required("PG_DATABASE", "eventhub"),
    poolMax: Number(process.env.PG_POOL_MAX ?? 10),
  },

  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET", "dev-access-secret-change-me"),
    accessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
    refreshTtlDays: Number(process.env.JWT_REFRESH_TTL_DAYS ?? 7),
  },
} as const;

export const isProduction = config.env === "production";
