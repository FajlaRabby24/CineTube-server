import { toNodeHandler } from "better-auth/node";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application } from "express";
import helmet from "helmet";
import path from "path";
import qs from "qs";
import { envVars } from "./app/config/env";
import { auth } from "./app/lib/auth";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { WebhookRoutes } from "./app/modules/webhook/webhook.route";
import { indexRoute } from "./app/routes";
import { rateLimiters } from "./app/utils/rateLImit";

const app: Application = express();

app.set("query parser", (str: string) => qs.parse(str));
app.set("view engine", "ejs");
app.set("views", path.resolve(process.cwd(), `src/app/templates`));

// 1. Security middleware সবার আগে
app.use(helmet());
app.use(
  cors({
    credentials: true,
    origin: [envVars.FRONTEND_URL, envVars.BETTER_AUTH_URL],
    methods: ["GET", "POST", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// 2. Better Auth
app.use("/api/auth/", toNodeHandler(auth));

// 3. Webhook — raw body, rate limiter নেই
app.use(
  "/api/v1/webhook",
  express.raw({ type: "application/json" }),
  WebhookRoutes,
);

// 4. Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 5. Rate limiters — body parse হওয়ার পরে
app.use(rateLimiters.globalLimiter);
app.use("/api/v1/auth", rateLimiters.authLimiter);
app.use(
  "/api/v1/subscriptions/create-checkout-session",
  rateLimiters.paymentLimiter,
);

// 6. Routes
app.use("/api/v1", indexRoute);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// 7. Error handlers সবার শেষে
app.use(globalErrorHandler);
app.use(notFound);

export default app;
