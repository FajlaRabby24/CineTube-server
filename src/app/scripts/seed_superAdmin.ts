import { Role } from "../../generated/prisma/enums";
import { envVars } from "../config/env";
import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";

const seedSuperAdmin = async () => {
  try {
    const existingAdmin = await prisma.user.findFirst({
      where: {
        role: Role.SUPER_ADMIN,
      },
    });

    if (existingAdmin) {
      return;
    }

    const name = envVars.NAME;
    const email = envVars.EMAIL;
    const password = envVars.PASSWORD;

    if (!name || !email || !password) {
      throw new Error(
        "NAME, EMAIL, and PASSWORD environment variables are required for seeding super admin",
      );
    }

    const superAdminData = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
        role: Role.SUPER_ADMIN,
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: superAdminData.user.id,
        },
        data: {
          emailVerified: true,
          bio: envVars.BIO!,
          phoneNumber: envVars.PHONE_NUMBER!,
        },
      });

      await tx.admin.create({
        data: {
          userId: superAdminData.user.id,
        },
      });
    });
  } catch (error) {}
};

seedSuperAdmin();
