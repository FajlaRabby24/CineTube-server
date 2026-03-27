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
}

export interface IUpdatePayload {
  name?: string;
  email?: string;
  password?: string;
  bio?: string;
  image?: string;
}
