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
      console.log("Super admin already exists");
      return;
    }

    const name = envVars.NAME;
    const email = envVars.EMAIL;
    const password = envVars.PASSWORD;

    if (!name || !email || !password) {
      throw new Error("NAME, EMAIL, and PASSWORD environment variables are required for seeding super admin");
    }

    const superAdminData = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: superAdminData.user.id,
        },
        data: {
          role: Role.SUPER_ADMIN,
          emailVerified: true,
        },
      });

      await tx.admin.create({
        data: {
          userId: superAdminData.user.id,
        },
      });
    });

    console.log("Super admin seeded successfully.");
  } catch (error) {
    console.error(`Error seeding super admin: ${error}`);
  }
};

seedSuperAdmin();
