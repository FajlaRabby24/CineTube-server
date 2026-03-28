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

    const superAdminData = await auth.api.signUpEmail({
      body: {
        name: envVars.SUPER_ADMIN_NAME,
        email: envVars.SUPER_ADMIN_EMAIL,
        password: envVars.SUPER_ADMIN_PASSWORD,
        role: Role.SUPER_ADMIN,
        needPasswordChange: false,
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: superAdminData.user.id,
        },
        data: {
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
    await prisma.user.delete({
      where: {
        email: envVars.SUPER_ADMIN_EMAIL,
      },
    });
  }
};

seedSuperAdmin();
