import status from "http-status";
import z from "zod";
import { IErrorResponse, IErrorSources } from "../interfaces/error.interfaces";

export const handleZodError = (err: z.ZodError): IErrorResponse => {
  const statusCode = status.BAD_REQUEST;
  const message = "Zod Validation Error";
  const errorSources: IErrorSources[] = [];

  err.issues.forEach((issue) => {
    errorSources.push({
      path: issue.path.join(" "),
      message: issue.message,
    });
  });

  return {
    success: false,
    message,
    errorSources,
    statusCode,
  };
};
