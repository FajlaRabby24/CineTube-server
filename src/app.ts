import { toNodeHandler } from "better-auth/node";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application } from "express";
import helmet from "helmet";
import { envVars } from "./app/config/env";
import { auth } from "./app/lib/auth";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { indexRoute } from "./app/routes";

const app: Application = express();

app.use(helmet());

app.use("/api/auth/", toNodeHandler(auth));

app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
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

app.use("/api", indexRoute);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
