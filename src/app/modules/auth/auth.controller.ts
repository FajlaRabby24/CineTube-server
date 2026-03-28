import { Request, Response } from "express";
import status from "http-status";
import { sendResponse } from "../../utils/sendResponse";
import { tokenUtils } from "../../utils/token";
import { authService } from "./auth.service";

const register = async (req: Request, res: Response) => {
  const payload = req.body;

  const user = await authService.register(payload);

  const { token, accessToken, refreshToken } = user;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);
  tokenUtils.setBetterAuthSessionCookie(res, token as string);

  sendResponse(
    res,
    status.CREATED,
    true,
    "User created successfully. Please check your email to verify your account.",
    user.user,
  );
};

const login = async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await authService.login(req, payload);
  const { accessToken, refreshToken, token, sessionId } = result;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);
  tokenUtils.setBetterAuthSessionCookie(res, token);

  sendResponse(res, status.OK, true, "User logged in successfully", {
    user: result.user,
    sessionId,
  });
};

export const authController = {
  register,
  login,
};
