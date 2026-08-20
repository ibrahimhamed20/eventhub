import express from "express";
import helmet from "helmet";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";

import {
  requestLogger,
  notFoundHandler,
  errorHandler,
} from "./middleware/core.js";
import { requireAuth } from "./middleware/auth.js";
import { swaggerSpec } from "./docs/swagger.js";

import { authRoutes } from "./modules/auth/auth.routes.js";
import { eventRoutes } from "./modules/events/events.routes.js";
import { bookingRoutes } from "./modules/bookings/bookings.routes.js";
import { typeDefs } from "./modules/analytics/analytics.schema.graphql.js";
import { resolvers } from "./modules/analytics/analytics.resolvers.js";
import { createLoaders } from "./modules/analytics/analytics.loaders.js";

export async function createApp(): Promise<express.Express> {
  const app = express();

  // --- Security & parsing (order matters) ---
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // --- Health check (public, unauthenticated on purpose:
  //     monitoring tools can't log in) ---
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", uptimeSec: process.uptime() });
  });

  // --- API documentation ---
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/openapi.json", (_req, res) => {
    res.json(swaggerSpec);
  });

  // --- GraphQL Analytics (Apollo Server 5 with DataLoader) ---
  const apollo = new ApolloServer({ typeDefs, resolvers });
  await apollo.start();

  app.use(
    "/graphql",
    requireAuth,
    expressMiddleware(apollo, {
      context: async ({ req }) => ({
        actor: req.user!,
        loaders: createLoaders(),
      }),
    }),
  );


  // --- Feature routes get mounted here as you build them ---
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/events", eventRoutes);
  app.use("/api/v1/bookings", bookingRoutes);

  // --- Must stay last, in this order ---
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
