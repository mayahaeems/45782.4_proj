export type Category = {
  id: number;
  name: string;
};

export type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  category_id?: number | null;
  category?: Category | null;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginUser = {
  email: string;
  role?: string | null;
};

export type LoginResponse = {
  token?: string | null;
  access_token?: string | null;
  user?: LoginUser | null;
};
