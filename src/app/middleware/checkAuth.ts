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
      //  ------------------- sesssion token ---------------
      const sessionToken = cookieUtils.getCookie(
        req,
        "better-auth.session_token",
      );
      if (!sessionToken) {
        throw new AppError(
          status.UNAUTHORIZED,
          "Unauthorized: No session token provided",
        );
      }

      if (sessionToken) {
        const sessionTokenExists = await prisma.session.findFirst({
          where: {
            token: sessionToken,
            expiresAt: {
              gt: new Date(),
            },
          },
          include: {
            user: true,
          },
        });

        if (sessionTokenExists && sessionTokenExists.user) {
          const user = sessionTokenExists.user;

          const now = new Date();
          const expiresAt = new Date(sessionTokenExists.expiresAt);
          const createAdt = new Date(sessionTokenExists.createdAt);

          const sessionLifeTime = expiresAt.getTime() - createAdt.getTime();
          const timeRemaining = expiresAt.getTime() - now.getTime();
          const percentRemaining = (timeRemaining / sessionLifeTime) * 100;

          if (percentRemaining < 20) {
            res.setHeader("X-Session-Refresh", "true");
            res.setHeader("X-Session-Expires-At", expiresAt.toString());
            res.setHeader("X-Time-Remaining", timeRemaining.toString());
          }

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

          if (authRoles.length > 0 && !authRoles.includes(user.role as Role)) {
            throw new AppError(
              status.FORBIDDEN,
              "You are not authorized to access this resource",
            );
          }

          req.user = {
            userId: user.id,
            role: user.role,
            email: user.email,
          };
        }
      }

      // ---------------- access token -----------------
      const accessToken = cookieUtils.getCookie(req, "accessToken");

      if (!accessToken) {
        throw new AppError(
          status.UNAUTHORIZED,
          "Unauthorized access! Access token not found",
        );
      }

      const verifiedToken = jwtUtils.verifyToken(
        accessToken,
        envVars.ACCESS_TOKEN_SECRET,
      );

      if (!verifiedToken.success) {
        throw new AppError(
          status.UNAUTHORIZED,
          "Unauthorized access! Invalid access token",
        );
      }

      if (
        authRoles.length > 0 &&
        !authRoles.includes(verifiedToken.data!.role as Role)
      ) {
        throw new AppError(
          status.FORBIDDEN,
          "You are not authorized to access this resource",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
