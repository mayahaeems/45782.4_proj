export type Category = { id: number; name: string };

export type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  category_id?: number | null;
  category?: Category | null;
};

export type LoginRequest = { email: string; password: string };
export type LoginResponse = {
  token?: string;
  access_token?: string;
  user?: { id: number; email: string; role?: string };
};
