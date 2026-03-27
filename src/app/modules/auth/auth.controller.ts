import { Request, Response } from "express";
import status from "http-status";
import { sendResponse } from "../../utils/sendResponse";
import { authService } from "./auth.service";

const register = async (req: Request, res: Response) => {
  const payload = req.body;

  const user = await authService.register(payload);

  sendResponse(res, status.CREATED, true, "User created successfully", user);
};

export const authController = {
  register,
};
