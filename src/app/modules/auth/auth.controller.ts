import { Request, Response } from "express";
import status from "http-status";
import { envVars } from "../../config/env";
import AppError from "../../errorhandlers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { auth } from "../../lib/auth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { tokenUtils } from "../../utils/token";
import { authService } from "./auth.service";

const register = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await authService.register(payload);

  sendResponse(
    res,
    status.CREATED,
    true,
    "Registration successful. Please verify your email.",
    result,
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
    accessToken,
    refreshToken,
    token,
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      image: result.user.image,
      role: result.user.role,
      emailVerified: result.user.emailVerified,
      needPasswordChange: result.user.needPasswordChange,
    },
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

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;

  if (!user) {
    return sendResponse(res, status.UNAUTHORIZED, false, "Unauthorized");
  }

  const result = await authService.getMyProfile(user);

  sendResponse(
    res,
    status.OK,
    true,
    "User profile fetched successfully",
    result,
  );
});

const getNewToken = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;
  const sessionToken = req.cookies[tokenUtils.getSessionCookieName()];

  if (!refreshToken) {
    throw new AppError(status.UNAUTHORIZED, "Refresh token is missing");
  }

  const result = await authService.getNewToken(refreshToken, sessionToken);

  const {
    accessToken,
    refreshToken: newRefreshToken,
    sessionToken: token,
  } = result;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, newRefreshToken);
  tokenUtils.setBetterAuthSessionCookie(res, token);

  sendResponse(res, status.OK, true, "New tokens generated successfully", {
    accessToken,
    newRefreshToken,
    token,
  });
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

  const result = await authService.profileUpdate(
    user.userId,
    payload,
    user.sessionId,
  );

  const { accessToken, refreshToken } = result;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);

  sendResponse(res, status.OK, true, "Profile updated successfully", {
    user: result.user,
    accessToken,
    refreshToken,
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const sessionToken = req.cookies[tokenUtils.getSessionCookieName()];
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
  const result = await authService.verifyEmail(req, email, otp);
  const { accessToken, refreshToken, token } = result;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);
  tokenUtils.setBetterAuthSessionCookie(res, token as string);

  sendResponse(res, status.OK, true, "Email verified successfully", {
    accessToken,
    refreshToken,
    token,
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      image: result.user.image,
      role: result.user.role,
      emailVerified: result.user.emailVerified,
      needPasswordChange: result.user.needPasswordChange,
    },
  });
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
  const { sessionId, token } = req.params;
  if (!sessionId) throw new Error("Session id not found");
  await authService.logoutSession(
    user.userId,
    sessionId as string,
    token as string,
  );

  sendResponse(res, status.OK, true, "Logged out successfully");
});

const logoutAllSession = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  if (!user) {
    return sendResponse(res, status.UNAUTHORIZED, false, "Unauthorized");
  }
  const token = req.cookies[tokenUtils.getSessionCookieName()];
  if (!token) throw new Error("Session token not found");

  await authService.logoutAllSession(user.userId, token as string);

  sendResponse(
    res,
    status.OK,
    true,
    "Logged out from other sessions successfully",
  );
});

const googleLogin = catchAsync(async (req: Request, res: Response) => {
  const redirectPath = (req.query?.redirect as string) || "/";

  const encodedRedirectPath = encodeURIComponent(redirectPath);
  const callbackURL = `${envVars.BETTER_AUTH_URL}/api/v1/auth/google/success?redirect=${encodedRedirectPath}`;

  res.render("googleRedirect", {
    callbackURL,
    betterAuthUrl: envVars.BETTER_AUTH_URL,
  });
});

// google login success
const googleLoginSuccess = catchAsync(async (req: Request, res: Response) => {
  const redirectPath = decodeURIComponent(req.query?.redirect as string) || "/";

  const sessionToken =
    req.cookies["better-auth.session_token"] ||
    req.cookies["__Secure-better-auth.session_token"];

  if (!sessionToken) {
    return res.redirect(`${envVars.FRONTEND_URL}/login?error=oauth_failed`);
  }

  // Pass the entire headers object to let better-auth handle prefixes and context
  const session = await auth.api.getSession({
    headers: req.headers as any,
  });

  if (!session) {
    return res.redirect(`${envVars.FRONTEND_URL}/login?error=no_session_found`);
  }

  if (session && !session.user) {
    return res.redirect(`${envVars.FRONTEND_URL}/login?error=no_user_found`);
  }

  const result = await authService.googleLoginSuccess(session);
  const { accessToken, refreshToken, sessionToken: sessionTokenVal } = result;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);
  tokenUtils.setBetterAuthSessionCookie(res, sessionTokenVal);

  const isValidRedirectPath =
    redirectPath.startsWith("/") && !redirectPath.startsWith("//");
  const finalRedirectPath = isValidRedirectPath ? redirectPath : "/";

  // Redirect to frontend callback page with tokens for cross-domain session sync
  const callbackUrl = new URL(`${envVars.FRONTEND_URL}/google-callback`);
  callbackUrl.searchParams.set("accessToken", accessToken);
  callbackUrl.searchParams.set("refreshToken", refreshToken);
  callbackUrl.searchParams.set("sessionToken", sessionTokenVal);
  callbackUrl.searchParams.set("redirectPath", finalRedirectPath);

  res.redirect(callbackUrl.toString());
});

// handle oauth error
const handleOAuthError = catchAsync(async (req: Request, res: Response) => {
  const error = (req.query.error as string) || "oauth_failed";
  res.redirect(`${envVars.FRONTEND_URL}/login?error=${error}`);
});

export const authController = {
  register,
  login,
  getMe,
  getMyProfile,
  getNewToken,
  getSessions,
  changePassword,
  verifyEmail,
  forgotPassword,
  resetPassword,
  logoutSession,
  logoutAllSession,
  profileUpdate,
  googleLogin,
  googleLoginSuccess,
  handleOAuthError,
};
