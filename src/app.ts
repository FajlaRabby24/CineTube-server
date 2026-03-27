import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application } from "express";
import helmet from "helmet";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { indexRoute } from "./app/routes";

const app: Application = express();

app.use(helmet());
// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());
app.use(cors());

app.use("/api", indexRoute);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
