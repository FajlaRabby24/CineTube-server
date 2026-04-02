import { toNodeHandler } from "better-auth/node";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import { envVars } from "./app/config/env";
import { auth } from "./app/lib/auth";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { indexRoute } from "./app/routes";
import { WebhookRoutes } from "./app/modules/webhook/webhook.route";

const app: Application = express();

app.use(helmet());

app.use("/api/auth/", toNodeHandler(auth));

// Stripe Webhook must be BEFORE express.json() to get the raw body
app.use(
  "/api/v1/webhook",
  express.raw({ type: "application/json" }),
  WebhookRoutes,
);

app.use(express.urlencoded({ extended: true }));

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    credentials: true,
    origin: [envVars.FRONTEND_URL, envVars.BETTER_AUTH_URL],
    methods: ["GET", "POST", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use("/api/v1", indexRoute);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
