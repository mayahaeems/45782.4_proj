import { create } from "zustand";
import { persist } from "zustand/middleware";

type AuthState = {
  token: string | null;
  email: string | null;
  role: string | null;

  login: (token: string, email?: string | null, role?: string | null) => void;
  logout: () => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      role: null,

      login: (token, email = null, role = null) =>
        set({ token, email, role }),

      logout: () =>
        set({ token: null, email: null, role: null }),
    }),
    { name: "auth_store" }
  )
);
