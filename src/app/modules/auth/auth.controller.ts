import { Request, Response } from "express";
import status from "http-status";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { tokenUtils } from "../../utils/token";
import { authService } from "./auth.service";

const register = catchAsync(async (req: Request, res: Response) => {
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
});

const login = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await authService.login(req, payload);
  const { accessToken, refreshToken, token } = result;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);
  tokenUtils.setBetterAuthSessionCookie(res, token);

  sendResponse(res, status.OK, true, "User logged in successfully", {
    id: result.user.id,
    name: result.user.name,
    email: result.user.email,
    image: result.user.image,
    bio: result.user.bio,
  });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;

  if (!user) {
    return sendResponse(res, status.UNAUTHORIZED, false, "Unauthorized");
  }

  const result = await authService.getMe(user);

  sendResponse(
    res,
    status.OK,
    true,
    "User profile fetched successfully",
    result,
  );
});

const getSessions = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;

  if (!user) {
    return sendResponse(res, status.UNAUTHORIZED, false, "Unauthorized");
  }

  const result = await authService.getUserSessions(user.userId);

  sendResponse(
    res,
    status.OK,
    true,
    "User sessions fetched successfully",
    result,
  );
});

const profileUpdate = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const payload = req.body;

  if (!user) {
    return sendResponse(res, status.UNAUTHORIZED, false, "Unauthorized");
  }

  const result = await authService.profileUpdate(user.userId, payload);

  const { accessToken, refreshToken } = result;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);

  sendResponse(
    res,
    status.OK,
    true,
    "Profile updated successfully",
    result.user,
  );
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const sessionToken = req.cookies["better-auth.session_token"];
  const result = await authService.changePassword(payload, sessionToken);

  const { accessToken, refreshToken, token } = result;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);
  tokenUtils.setBetterAuthSessionCookie(res, token as string);

  sendResponse(
    res,
    status.OK,
    true,
    "Password changed successfully",
    result.user,
  );
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  await authService.verifyEmail(email, otp);

  sendResponse(res, status.OK, true, "Email verified successfully");
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  await authService.forgotPassword(email);

  sendResponse(
    res,
    status.OK,
    true,
    "Password reset OTP sent to email successfully",
  );
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  await authService.resetPassword(email, otp, newPassword);

  sendResponse(res, status.OK, true, "Password reset successfully");
});

const logoutSession = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const sessionId = req.params.sessionId;
  if (!sessionId) throw new Error("Session id not found");
  await authService.logoutSession(user.userId, sessionId as string);

  sendResponse(res, status.OK, true, "Logged out successfully");
});

const logoutAllSession = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  if (!user) {
    return sendResponse(res, status.UNAUTHORIZED, false, "Unauthorized");
  }
  const token = req.cookies["better-auth.session_token"];
  if (!token) throw new Error("Session token not found");

  await authService.logoutAllSession(user.userId, token as string);

  sendResponse(res, status.OK, true, "Logged out from other sessions successfully");
});

export const authController = {
  register,
  login,
  getMe,
  getSessions,
  changePassword,
  verifyEmail,
  forgotPassword,
  resetPassword,
  logoutSession,
  logoutAllSession,
  profileUpdate,
};
