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
  try {
    const templatePath = path.resolve(
      process.cwd(),
      `src/app/templates/${templateName}.ejs`,
    );

    const html = await ejs.renderFile(templatePath, templateData);

    const info = await transporter.sendMail({
      from: envVars.EMAIL_SENDER_SMTP_FROM,
      to,
      subject,
      html,
      attachments: attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
      })),
    });

    console.log(`Email sent to ${to} : ${info.messageId}`);
  } catch (error: any) {
    console.log(`Email sending error ${error.message}`);
    throw new AppError(status.INTERNAL_SERVER_ERROR, "Failed to send email.");
  }
};
