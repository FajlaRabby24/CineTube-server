import { Request } from "express";
import AppError from "../../errorhandlers/AppError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { tokenUtils } from "../../utils/token";
import { ILoginPayload, IRegisterPayload } from "./auth.type";

const register = async (payload: IRegisterPayload) => {
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

  const tokenInfo = {
    userId: data.user.isBanned,
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    image: data.user.image,
    isBanned: data.user.isBanned,
    isActive: data.user.isActive,
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
      ipAddress: req.ip ?? req.socket.remoteAddress,
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
    sessionId: session?.id, // ✅ frontend এর জন্য
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
        Authorization: `Bearer ${session.token}`,
      }),
    });
  } catch (_) {}

  await prisma.session.delete({
    where: { id: sessionId },
  });

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

export const authService = {
  register,
  login,
  logoutSession,
  logoutAllSession,
};
