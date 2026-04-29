import { Request } from "express";
import status from "http-status";
import { JwtPayload } from "jsonwebtoken";
import { UAParser } from "ua-parser-js";
import { deleteFromCloudinary } from "../../config/cloudinary.config";
import { envVars } from "../../config/env";
import AppError from "../../errorhandlers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import { tokenUtils } from "../../utils/token";
import {
  IChangePasswordPayload,
  ILoginPayload,
  IRegisterPayload,
  IUpdatePayload,
} from "./auth.type";

const register = async (payload: IRegisterPayload) => {
  const { name, email, password, bio, image } = payload;
  try {
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

    return {
      user: {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        image: data.user.image,
        role: data.user.role,
        emailVerified: data.user.emailVerified,
        needPasswordChange: data.user.needPasswordChange,
      },
    };
  } catch (error) {
    if (image) {
      await deleteFromCloudinary(image);
    }
  }
};

const verifyEmail = async (req: Request, email: string, otp: string) => {
  const result = await auth.api.verifyEmailOTP({
    body: {
      email,
      otp,
    },
  });

  // ✅ ban/active check আগে করো, session update এর আগে
  if (result.user.isBanned || !result.user.isActive) {
    throw new AppError(400, "User is banned or not active");
  }

  // ✅ device info + sessionId একসাথে
  const session = await prisma.session.findFirst({
    where: { token: result.token! },
    select: { id: true },
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

    await prisma.session.updateMany({
      where: { token: result.token! },
      data: {
        ipAddress: req.ip ?? req.socket.remoteAddress ?? null,
        userAgent: req.headers["user-agent"] ?? "unknown",
      },
    });
  }

  const tokenInfo = {
    userId: result.user.id,
    role: result.user.role,
    name: result.user.name,
    email: result.user.email,
    image: result.user.image,
    isBanned: result.user.isBanned,
    isActive: result.user.isActive,
    sessionId: session?.id,
  };

  const accessToken = tokenUtils.getAccessToken(tokenInfo);
  const refreshToken = tokenUtils.getRefreshToken(tokenInfo);

  return {
    ...result,
    accessToken,
    refreshToken,
  };
};

// const login = async (req: Request, payload: ILoginPayload) => {
//   const { email, password } = payload;

//   const data = await auth.api.signInEmail({
//     body: { email, password },
//   });

//   if (!data?.token) {
//     throw new AppError(401, "Invalid credentials");
//   }

//   // ✅ ban/active check আগে করো, session update এর আগে
//   if (data.user.isBanned || !data.user.isActive) {
//     throw new AppError(400, "User is banned or not active");
//   }

//   // ✅ device info + sessionId একসাথে
//   const session = await prisma.session.findFirst({
//     where: { token: data.token },
//     select: { id: true },
//   });

//   await prisma.session.updateMany({
//     where: { token: data.token },
//     data: {
//       ipAddress: req.ip ?? req.socket.remoteAddress ?? null,
//       userAgent: req.headers["user-agent"] ?? "unknown",
//     },
//   });

//   const tokenInfo = {
//     userId: data.user.id,
//     role: data.user.role,
//     name: data.user.name,
//     email: data.user.email,
//     image: data.user.image,
//     isBanned: data.user.isBanned,
//     isActive: data.user.isActive,
//     sessionId: session?.id,
//   };

//   const accessToken = tokenUtils.getAccessToken(tokenInfo);
//   const refreshToken = tokenUtils.getRefreshToken(tokenInfo);

//   return {
//     ...data,
//     accessToken,
//     refreshToken,
//   };
// };

const login = async (req: Request, payload: ILoginPayload) => {
  const { email, password, userAgent: clientUserAgent } = payload;

  const data = await auth.api.signInEmail({
    body: { email, password },
  });

  if (!data?.token) {
    throw new AppError(401, "Invalid credentials");
  }

  if (data.user.isBanned || !data.user.isActive) {
    throw new AppError(400, "User is banned or not active");
  }

  const session = await prisma.session.findFirst({
    where: { token: data.token },
    select: { id: true },
  });
  const rawUserAgent =
    clientUserAgent ?? req.headers["user-agent"] ?? "unknown";
  const parser = new UAParser(rawUserAgent);
  const os = parser.getOS();
  const device = parser.getDevice();

  const formattedUserAgent =
    device.type === "mobile" || device.type === "tablet"
      ? `${device.vendor ?? ""} ${device.model ?? ""} (${os.name ?? "Unknown"})`.trim()
      : `${os.name ?? "Unknown"} ${os.version ?? ""}`.trim() || rawUserAgent;
  const rawIp = req.ip ?? req.socket.remoteAddress ?? null;
  const ipAddress = rawIp === "::1" ? "127.0.0.1" : rawIp;

  await prisma.session.updateMany({
    where: { token: data.token },
    data: {
      ipAddress,
      userAgent: formattedUserAgent,
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

const logoutSession = async (
  userId: string,
  sessionId: string,
  token: string,
) => {
  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId, token },
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
    where: { id: sessionId, token, userId },
    select: {
      id: true,
    },
  });

  if (!result) {
    throw new AppError(404, "Session does not exist");
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
      emailVerified: true,
      needPasswordChange: true,
      sessions: {
        select: {
          id: true,
          token: true,
        },
      },
    },
  });

  if (!isUserExists) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  return isUserExists;
};

const getMyProfile = async (user: IRequestUser) => {
  const isUserExists = await prisma.user.findUnique({
    where: {
      id: user.userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      isActive: true,
      phoneNumber: true,
      bio: true,
      accounts: {
        select: {
          id: true,
        },
      },
      watchlists: true,
      reviews: true,
      subscription: true,
      comments: true,
      notifications: true,
      payments: true,
      reports: true,
      reviewLikes: true,
      sessions: {
        select: {
          userAgent: true,
          token: true,
          id: true,
        },
      },
      admin: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!isUserExists) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  return isUserExists;
};

const getNewToken = async (refreshToken: string, sessionToken: string) => {
  const isSessionTokenExists = await prisma.session.findUnique({
    where: {
      token: sessionToken,
    },
    include: {
      user: true,
    },
  });

  if (!isSessionTokenExists) {
    throw new AppError(status.UNAUTHORIZED, "Invalid session token");
  }

  const verifiedRefreshToken = jwtUtils.verifyToken(
    refreshToken,
    envVars.REFRESH_TOKEN_SECRET,
  );

  if (!verifiedRefreshToken.success && verifiedRefreshToken.error) {
    throw new AppError(status.UNAUTHORIZED, "Invalid refresh token");
  }

  const data = verifiedRefreshToken.data as JwtPayload;

  const tokenInfo = {
    userId: data.userId,
    role: data.role,
    name: data.name,
    email: data.email,
    status: data.status,
    isDeleted: data.isDeleted,
    emailVerified: data.emailVerified,
  };

  const newAccessToken = tokenUtils.getAccessToken(tokenInfo);
  const newRefreshToken = tokenUtils.getRefreshToken(tokenInfo);

  // update session
  const { token } = await prisma.session.update({
    where: {
      token: sessionToken,
    },
    data: {
      token: sessionToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 60 * 24 * 1000),
      updatedAt: new Date(),
    },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    sessionToken: token,
  };
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
      Cookie: `${tokenUtils.getSessionCookieName()}=${sessionToken}`,
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
  getMyProfile,
  getNewToken,
  getSession,
  profileUpdate,
  getUserSessions,
  googleLoginSuccess,
};
