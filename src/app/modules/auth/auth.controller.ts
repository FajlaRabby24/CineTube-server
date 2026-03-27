import { Request, Response } from "express";
import { authService } from "./auth.service";

const register = async (req: Request, res: Response) => {
  const payload = req.body;

  const user = await authService.register(payload);

  return res.status(201).json(user);
};

export const authController = {
  register,
};
