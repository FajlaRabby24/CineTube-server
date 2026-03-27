/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from "express";

export const sendResponse = (
  res: Response,
  statusCode: number,
  success: boolean,
  message?: string,
  data?: any,
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  },
) => {
  res.status(statusCode).json({
    success,
    message,
    data,
    meta,
  });
};
