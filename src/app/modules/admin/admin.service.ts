import status from "http-status";
import { Role } from "../../../generated/prisma/enums";
import AppError from "../../errorhandlers/AppError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { IAdminCreatePayload } from "./admin.type";

const createAdminIntoDB = async (payload: IAdminCreatePayload) => {
  const { name, email, password, designation, address } = payload;

  // 1. Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError(status.CONFLICT, "User with this email already exists");
  }

  // 2. Create User using better-auth
  const userData = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
      // @ts-ignore
      role: Role.ADMIN,
    },
  });

  if (!userData || !userData.user) {
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "Failed to create admin user",
    );
  }

  // 3. Create Admin record and update user status in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Mark email as verified for admin created by super admin
    await tx.user.update({
      where: { id: userData.user.id },
      data: { emailVerified: true },
    });

    const admin = await tx.admin.create({
      data: {
        userId: userData.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    return admin;
  });

  return result;
};

export const AdminService = {
  createAdminIntoDB,
};
