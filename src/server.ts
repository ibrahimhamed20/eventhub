import { createApp } from "./app.js";
import { config } from "./config/index.js";
import { pool, closePool } from "./db/pool.js";

process.on("unhandledRejection", (reason) => {
  console.error("⚠️  Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught exception:", err);
  process.exit(1);
});

async function start(): Promise<void> {
  // Fail fast at startup if the database is unreachable, rather
  // than accepting traffic and failing on the first request.
  await pool.query("SELECT 1");
  console.log("✅ Database connection verified");

  const app = await createApp();
  const server = app.listen(config.port, () => {

    console.log(`🚀 EventHub running on http://localhost:${config.port}`);
    console.log(`📚 API docs at         http://localhost:${config.port}/docs`);
  });

  // Graceful shutdown: stop accepting new connections, finish
  // in-flight requests, then close the database pool.
  const shutdown = (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    server.close(() => {
      void closePool().then(() => {
        console.log("Closed database pool. Bye.");
        process.exit(0);
      });
    });
    // Force-exit if graceful shutdown hangs
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
