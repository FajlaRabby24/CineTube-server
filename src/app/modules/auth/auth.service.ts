import AppError from "../../errorhandlers/AppError";
import { auth } from "../../lib/auth";
import { tokenUtils } from "../../utils/token";
import { IRegisterPayload } from "./auth.type";

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

  // TODO: Generate token and set it in the response header or cookie
  const accessToken = tokenUtils.getAccessToken(tokenInfo);
  const refreshToken = tokenUtils.getRefreshToken(tokenInfo);

  return {
    ...data,
    accessToken,
    refreshToken,
  };
};

export const authService = {
  register,
};
