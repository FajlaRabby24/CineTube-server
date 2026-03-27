import { auth } from "../../lib/auth";
import { IRegisterPayload } from "./auth.type";

const register = async (payload: IRegisterPayload) => {
  const { name, email, password, bio, image } = payload;

  const user = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
      bio,
      image,
    },
  });

  return user;
};

export const authService = {
  register,
};
