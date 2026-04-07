import { Request } from "express";
import status from "http-status";
import AppError from "../../errorhandlers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { tokenUtils } from "../../utils/token";
import {
  IChangePasswordPayload,
  ILoginPayload,
  IRegisterPayload,
  IUpdatePayload,
} from "./auth.type";

const register = async (req: Request, payload: IRegisterPayload) => {
  const { name, email, password, bio, image } = payload;

  const data = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
      bio,
      image,
    },
  });

  if (!data.user) {
    throw new AppError(400, "User not found");
  }

  const session = await prisma.session.findFirst({
    where: { token: data.token! },
    select: { id: true },
  });

  await prisma.session.updateMany({
    where: { token: data.token! },
    data: {
      ipAddress: req.ip ?? req.socket.remoteAddress ?? null,
      userAgent: req.headers["user-agent"] ?? "unknown",
    },
  });

  const tokenInfo = {
    userId: data.user.id,
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    image: data.user.image,
    isBanned: data.user.isBanned,
    isActive: data.user.isActive,
    sessionId: session?.id,
  };

  const accessToken = tokenUtils.getAccessToken(tokenInfo);
  const refreshToken = tokenUtils.getRefreshToken(tokenInfo);

  return {
    ...data,
    accessToken,
    refreshToken,
  };
};

const login = async (req: Request, payload: ILoginPayload) => {
  const { email, password } = payload;

  const data = await auth.api.signInEmail({
    body: { email, password },
  });

  if (!data?.token) {
    throw new AppError(401, "Invalid credentials");
  }

  // ✅ ban/active check আগে করো, session update এর আগে
  if (data.user.isBanned || !data.user.isActive) {
    throw new AppError(400, "User is banned or not active");
  }

  // ✅ device info + sessionId একসাথে
  const session = await prisma.session.findFirst({
    where: { token: data.token },
    select: { id: true },
  });

  await prisma.session.updateMany({
    where: { token: data.token },
    data: {
      ipAddress: req.ip ?? req.socket.remoteAddress ?? null,
      userAgent: req.headers["user-agent"] ?? "unknown",
    },
  });

  const tokenInfo = {
    userId: data.user.id,
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    image: data.user.image,
    isBanned: data.user.isBanned,
    isActive: data.user.isActive,
    sessionId: session?.id,
  };

  const accessToken = tokenUtils.getAccessToken(tokenInfo);
  const refreshToken = tokenUtils.getRefreshToken(tokenInfo);

  return {
    ...data,
    accessToken,
    refreshToken,
  };
};

const logoutSession = async (userId: string, sessionId: string) => {
  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId },
  });

  if (!session) {
    throw new AppError(404, "Session not found");
  }

  try {
    await auth.api.signOut({
      headers: new Headers({
        Authorization: `Bearer ${session.id}`,
      }),
    });
  } catch (_) {}

  const result = await prisma.session.delete({
    where: { id: sessionId },
    select: {
      id: true,
    },
  });

  if (!result) {
    throw new AppError(404, "Session not found");
  }
  return true;
};

const logoutAllSession = async (userId: string, token: string) => {
  const currentSession = await prisma.session.findFirst({
    where: { userId, token },
  });

  if (!currentSession) {
    throw new AppError(401, "Current session invalid");
  }

  await prisma.session.deleteMany({
    where: {
      userId,
      OR: [{ NOT: { token } }, { expiresAt: { lt: new Date() } }],
    },
  });

  return true;
};

const forgotPassword = async (email: string) => {
  const isUserExists = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      emailVerified: true,
      isBanned: true,
      isActive: true,
    },
  });

  if (!isUserExists) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  if (!isUserExists.emailVerified) {
    throw new AppError(status.BAD_REQUEST, "Email not verified");
  }

  if (isUserExists.isBanned || !isUserExists.isActive) {
    throw new AppError(status.BAD_REQUEST, "User is banned or not active");
  }

  await auth.api.requestPasswordResetEmailOTP({
    body: {
      email,
    },
  });
};

const verifyEmail = async (email: string, otp: string) => {
  const result = await auth.api.verifyEmailOTP({
    body: {
      email,
      otp,
    },
  });

  if (result.status && !result.user.emailVerified) {
    await prisma.user.update({
      where: {
        email,
      },
      data: {
        emailVerified: true,
      },
    });
  }
};

const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string,
) => {
  const isUserExists = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      emailVerified: true,
      isActive: true,
      isBanned: true,
    },
  });

  if (!isUserExists) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  if (!isUserExists.emailVerified) {
    throw new AppError(status.BAD_REQUEST, "Email not verified");
  }

  if (isUserExists.isBanned || !isUserExists.isActive) {
    throw new AppError(status.BAD_REQUEST, "User is banned or not active");
  }

  await auth.api.resetPasswordEmailOTP({
    body: {
      email,
      otp,
      password: newPassword,
    },
  });

  await prisma.session.deleteMany({
    where: {
      userId: isUserExists.id,
    },
  });
};

const changePassword = async (
  payload: IChangePasswordPayload,
  sessionToken: string,
) => {
  const session = await auth.api.getSession({
    headers: new Headers({
      Authorization: `Bearer ${sessionToken}`,
    }),
  });

  if (!session) {
    throw new AppError(status.UNAUTHORIZED, "Invalid session token");
  }

  const { currentPassword, newPassword } = payload;

  const result = await auth.api.changePassword({
    body: {
      currentPassword,
      newPassword,
      revokeOtherSessions: true, // Revoke all other sessions except the current one
    },
    headers: new Headers({
      Authorization: `Bearer ${sessionToken}`,
    }),
  });

  const tokenInfo = {
    userId: session.user.id,
    role: session.user.role,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    isBanned: session.user.isBanned,
    isActive: session.user.isActive,
  };

  const accessToken = tokenUtils.getAccessToken(tokenInfo);
  const refreshToken = tokenUtils.getRefreshToken(tokenInfo);

  return {
    ...result,
    accessToken,
    refreshToken,
  };
};

const getMe = async (user: IRequestUser) => {
  const isUserExists = await prisma.user.findUnique({
    where: {
      id: user.userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      isActive: true,
      isBanned: true,
      role: true,
    },
  });

  if (!isUserExists) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  return isUserExists;
};

const getUserSessions = async (userId: string) => {
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return sessions;
};

const profileUpdate = async (userId: string, payload: IUpdatePayload) => {
  const isUserExists = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!isUserExists) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  const { ...updateData } = payload;

  const result = await prisma.user.update({
    where: {
      id: userId,
    },
    data: updateData,
  });

  const tokenInfo = {
    name: result.name,
    email: result.email,
    bio: result.bio,
    phoneNumber: result.phoneNumber,
    image: result.image,
  };

  const accessToken = tokenUtils.getAccessToken(tokenInfo);
  const refreshToken = tokenUtils.getRefreshToken(tokenInfo);

  return {
    user: {
      id: result.id,
      name: result.name,
      email: result.email,
      image: result.image,
      bio: result.bio,
    },
    accessToken,
    refreshToken,
  };
};

const getSession = async (sessionToken: string) => {
  const session = await auth.api.getSession({
    headers: {
      Cookie: `better-auth.session_token=${sessionToken}`,
    },
  });

  return session;
};

const googleLoginSuccess = async (session: Record<string, any>) => {
  const isUserExists = await prisma.user.findUnique({
    where: {
      id: session?.user?.id,
    },
  });

  if (!isUserExists) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  const tokenInfo = {
    userId: session?.user?.id,
    role: session?.user?.role,
    name: session?.user?.name,
  };

  const accessToken = tokenUtils.getAccessToken(tokenInfo);
  const refreshToken = tokenUtils.getRefreshToken(tokenInfo);

  return {
    accessToken,
    refreshToken,
  };
};

export const authService = {
  register,
  login,
  logoutSession,
  logoutAllSession,
  forgotPassword,
  verifyEmail,
  resetPassword,
  changePassword,
  getMe,
  getSession,
  profileUpdate,
  getUserSessions,
  googleLoginSuccess,
};
