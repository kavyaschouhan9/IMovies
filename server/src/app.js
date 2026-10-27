import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import crypto from "node:crypto";
import routes from "./routes/index.js";
import { optionalAuth } from "./middleware/auth.js";
import { notFound, errorHandler } from "./middleware/errors.js";
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    req.id = crypto.randomUUID();
    res.setHeader("X-Request-Id", req.id);
    next();
  });
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  const origins = [
    "https://i-movies-blush.vercel.app",
    "http://localhost:5173",
  ];
  app.use(
    cors({
      origin: origins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  app.use(
    "/api/v1/payments/webhook",
    express.raw({ type: "application/json", limit: "1mb" }),
    (req, res, next) => {
      req.rawBody = req.body;
      try {
        req.body = JSON.parse(req.body.toString());
      } catch {}
      next();
    },
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: false, limit: "20kb" }));
  app.use(cookieParser());
  if (process.env.NODE_ENV !== "test") app.use(morgan("tiny"));
  app.use(
    "/api/v1/auth",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 30,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.use(
    "/api/v1/payments",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 40,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.use("/api/v1", optionalAuth, routes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
