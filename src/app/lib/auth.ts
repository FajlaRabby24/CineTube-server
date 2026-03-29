import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer, emailOTP } from "better-auth/plugins";
import { Role } from "../../generated/prisma/enums";
import { envVars } from "../config/env";
import { sendEmail } from "../utils/email";
import { prisma } from "./prisma";

const isProduction = envVars.NODE_ENV === "production";

export const auth = betterAuth({
  baseURL: envVars.BETTER_AUTH_URL,
  secret: envVars.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins: [envVars.FRONTEND_URL, envVars.BETTER_AUTH_URL],
  advanced: {
    disableCSRFCheck: true,
    useSecureCookies: isProduction,
    cookies: {
      state: {
        attributes: {
          sameSite: isProduction ? "strict" : "lax",
          secure: isProduction,
          httpOnly: true,
          path: "/",
        },
      },
      sessionToken: {
        attributes: {
          sameSite: isProduction ? "strict" : "lax",
          secure: isProduction,
          httpOnly: true,
          path: "/",
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignIn: true,
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: Role.USER,
      },
      bio: {
        type: "string",
        required: false,
      },
      isActive: {
        type: "boolean",
        defaultValue: true,
        required: false,
      },
      isBanned: {
        type: "boolean",
        defaultValue: false,
        required: false,
      },
      bannedReason: {
        type: "string",
        required: false,
      },
      bannedAt: {
        type: "date",
        required: false,
      },
      needPasswordChange: {
        type: "boolean",
        defaultValue: false,
        required: false,
      },
    },
  },
  plugins: [
    bearer(),
    emailOTP({
      overrideDefaultEmailVerification: true,
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "email-verification") {
          const user = await prisma.user.findUnique({
            where: {
              email,
            },
          });

          if (!user) {
            console.error("User not found");
            return;
          }

          if (user?.role === Role.ADMIN || user?.role === Role.SUPER_ADMIN) {
            console.log(
              `User with email ${email} is an admin. Skipping sending verification OTP.`,
            );
            return;
          }

          if (user && !user.emailVerified) {
            sendEmail({
              to: email,
              subject: "Verify your email",
              templateName: "otp",
              templateData: {
                name: user.name,
                otp,
              },
            });
          }
        } else if (type === "forget-password") {
          const user = await prisma.user.findUnique({
            where: {
              email,
            },
          });

          if (!user) {
            console.error("User not found");
            return;
          }

          if (user) {
            sendEmail({
              to: email,
              subject: "Password Reset OTP",
              templateName: "otp",
              templateData: {
                name: user.name,
                otp,
              },
            });
          }
        }
      },
      expiresIn: 2 * 60,
      otpLength: 6,
    }),
  ],
});
