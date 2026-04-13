import { NextFunction, Request, Response } from "express";
import z from "zod";

export const validateRequest = (zodSchema: z.ZodObject) => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log(req.body, "validate request");
    try {
      if (req.body?.data) {
        req.body = JSON.parse(req.body.data);
      }

      const parsedResult = zodSchema.safeParse(req.body);

      if (!parsedResult.success) {
        next(parsedResult.error);
      }

      // sanitize data
      req.body = parsedResult.data;
      next();
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  };
};
