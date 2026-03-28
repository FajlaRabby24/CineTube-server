import { NextFunction, Request, Response } from "express";
import status from "http-status";
import { Role } from "../../generated/prisma/enums";
import { envVars } from "../config/env";
import AppError from "../errorhandlers/AppError";
import { prisma } from "../lib/prisma";
import { cookieUtils } from "../utils/cookie";
import { jwtUtils } from "../utils/jwt";

export const checkAuth =
  (...authRoles: Role[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionToken = cookieUtils.getCookie(
        req,
        "better-auth.session_token",
      );
      const accessToken = cookieUtils.getCookie(req, "accessToken");

      // ✅ দুটোর একটাও না থাকলে error
      if (!sessionToken && !accessToken) {
        throw new AppError(
          status.UNAUTHORIZED,
          "Unauthorized: No token provided",
        );
      }

      let userId: string | undefined;
      let userRole: Role | undefined;
      let userEmail: string | undefined;

      // ✅ Session আগে check করো
      if (sessionToken) {
        const session = await prisma.session.findFirst({
          where: {
            token: sessionToken,
            expiresAt: { gt: new Date() },
          },
          include: {
            user: {
              select: {
                id: true,
                role: true,
                email: true,
                isActive: true,
                isBanned: true,
              },
            },
          },
        });

        if (session?.user) {
          const user = session.user;

          if (!user.isActive) {
            throw new AppError(
              status.FORBIDDEN,
              "Your account is deactivated. Please contact support.",
            );
          }

          if (user.isBanned) {
            throw new AppError(
              status.FORBIDDEN,
              "Your account is banned. Please contact support.",
            );
          }

          // Session refresh header
          const now = new Date();
          const expiresAt = new Date(session.expiresAt);
          const createdAt = new Date(session.createdAt);
          const sessionLifeTime = expiresAt.getTime() - createdAt.getTime();
          const timeRemaining = expiresAt.getTime() - now.getTime();
          const percentRemaining = (timeRemaining / sessionLifeTime) * 100;

          if (percentRemaining < 20) {
            res.setHeader("X-Session-Refresh", "true");
            res.setHeader("X-Session-Expires-At", expiresAt.toString());
            res.setHeader("X-Time-Remaining", timeRemaining.toString());
          }

          userId = user.id;
          userRole = user.role;
          userEmail = user.email;
        }
      }

      // ✅ Session কাজ না করলে তখনই accessToken check করো
      if (!userId && accessToken) {
        const verifiedToken = jwtUtils.verifyToken(
          accessToken,
          envVars.ACCESS_TOKEN_SECRET,
        );

        if (!verifiedToken.success || !verifiedToken.data) {
          throw new AppError(status.UNAUTHORIZED, "Invalid access token");
        }

        const { userId: uid, role, email } = verifiedToken.data;

        if (!uid || !role) {
          throw new AppError(status.UNAUTHORIZED, "Invalid token payload");
        }

        userId = uid as string;
        userRole = role as Role;
        userEmail = email as string;
      }

      // ✅ Final validation
      if (!userId || !userRole) {
        throw new AppError(status.UNAUTHORIZED, "Unauthorized: Invalid token");
      }

      // ✅ Role check একবারই
      if (authRoles.length > 0 && !authRoles.includes(userRole as Role)) {
        throw new AppError(
          status.FORBIDDEN,
          "You are not authorized to access this resource",
        );
      }

      req.user = { userId, role: userRole, email: userEmail! };

      next();
    } catch (error) {
      next(error);
    }
  };
