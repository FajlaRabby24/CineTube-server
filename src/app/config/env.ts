import dotenv from "dotenv";
dotenv.config();

export const envVars = {
  NODE_ENV: process.env.NODE_ENV as string,
  PORT: process.env.PORT as string,
  DATABASE_URL: process.env.DATABASE_URL as string,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL as string,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET as string,
};
