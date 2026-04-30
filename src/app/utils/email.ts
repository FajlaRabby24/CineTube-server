/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import fs from "fs";
import nodemailer from "nodemailer";
import path from "path";
import { envVars } from "../config/env";

import ejs from "ejs";
import AppError from "../errorhandlers/AppError";

const transporter = nodemailer.createTransport({
  host: envVars.EMAIL_SENDER_SMTP_HOST,
  secure: Number(envVars.EMAIL_SENDER_SMTP_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: envVars.EMAIL_SENDER_SMTP_USER,
    pass: envVars.EMAIL_SENDER_SMTP_PASS,
  },
  port: Number(envVars.EMAIL_SENDER_SMTP_PORT),
  pool: true, // Use connection pooling for better stability
  logger: true, // Log SMTP traffic to Render logs for easier debugging
  debug: true, // Include debug info in logs
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000, // 10 seconds
  socketTimeout: 10000, // 10 seconds
});

interface ISendEmailOptions {
  to: string;
  subject: string;
  templateName: string;
  templateData: Record<string, any>;
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType: string;
  }[];
}

export const sendEmail = async ({
  to,
  subject,
  templateData,
  attachments,
  templateName,
}: ISendEmailOptions) => {
  if (
    !envVars.EMAIL_SENDER_SMTP_HOST ||
    !envVars.EMAIL_SENDER_SMTP_USER ||
    !envVars.EMAIL_SENDER_SMTP_PASS
  ) {
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "SMTP configuration is missing in environment variables.",
    );
  }

  try {
    // Detect if we are in production and use the appropriate templates directory
    const isProduction = process.env.NODE_ENV === "production";
    const templatesDir = isProduction
      ? path.join(process.cwd(), "dist", "app", "templates")
      : path.join(process.cwd(), "src", "app", "templates");

    const templatePath = path.join(templatesDir, `${templateName}.ejs`);

    if (!fs.existsSync(templatePath)) {
      console.error(`Email template not found at: ${templatePath}`);
      // Fallback to src if dist fails (for some deployment types)
      const fallbackPath = path.join(
        process.cwd(),
        "src",
        "app",
        "templates",
        `${templateName}.ejs`,
      );
      if (fs.existsSync(fallbackPath)) {
        console.log(`Using fallback template path: ${fallbackPath}`);
      } else {
        throw new AppError(
          status.INTERNAL_SERVER_ERROR,
          `Email template not found: ${templateName}`,
        );
      }
    }

    const html = await ejs.renderFile(
      fs.existsSync(templatePath)
        ? templatePath
        : path.join(process.cwd(), "src", "app", "templates", `${templateName}.ejs`),
      templateData,
    );

    await transporter.sendMail({
      from: envVars.EMAIL_SENDER_SMTP_FROM || envVars.EMAIL_SENDER_SMTP_USER,
      to,
      subject,
      html,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
  } catch (error: any) {
    console.error("Email sending error:", error);
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      `Failed to send email: ${error.message}`,
    );
  }
};
