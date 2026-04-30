/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import nodemailer from "nodemailer";
import path from "path";
import { envVars } from "../config/env";

import ejs from "ejs";
import AppError from "../errorhandlers/AppError";

const transporter = nodemailer.createTransport({
  host: envVars.EMAIL_SENDER_SMTP_HOST,
  secure: true,
  auth: {
    user: envVars.EMAIL_SENDER_SMTP_USER,
    pass: envVars.EMAIL_SENDER_SMTP_PASS,
  },
  port: Number(envVars.EMAIL_SENDER_SMTP_PORT),
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
    const templatePath = path.resolve(
      process.cwd(),
      "src/app/templates",
      `${templateName}.ejs`,
    );

    const html = await ejs.renderFile(templatePath, templateData);

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
