export interface IRegisterPayload {
  name: string;
  email: string;
  password: string;
  bio?: string;
  image?: string;
}

export interface ILoginPayload {
  email: string;
  password: string;
  userAgent?: string;
}

export interface IUpdatePayload {
  name?: string;
  bio?: string;
  image?: string;
  phoneNumber?: string;
}

export interface IChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
