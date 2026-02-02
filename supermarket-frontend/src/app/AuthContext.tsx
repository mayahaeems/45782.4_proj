import React, { createContext, useContext, useMemo, useState } from "react";
import { apiPost } from "../api/client";
import type { LoginRequest, LoginResponse } from "../types";

type AuthState = {
  token: string | null;
  userEmail: string | null;
  role: string | null;
  login: (req: LoginRequest) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthState | null>(null);

const LS_TOKEN = "sm_token";
const LS_EMAIL = "sm_email";
const LS_ROLE = "sm_role";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(LS_TOKEN));
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem(LS_EMAIL));
  const [role, setRole] = useState<string | null>(() => localStorage.getItem(LS_ROLE));

  async function login(req: LoginRequest) {
    // Change endpoint if yours differs:
    const res = await apiPost<LoginResponse>("/auth/login", req);
    const t = res.token ?? res.access_token ?? null;
    if (!t) throw new Error("Login succeeded but no token returned");

    setToken(t);
    localStorage.setItem(LS_TOKEN, t);

    const email = res.user?.email ?? req.email;
    setUserEmail(email);
    localStorage.setItem(LS_EMAIL, email);

    const r = res.user?.role ?? null;
    setRole(r);
    if (r) localStorage.setItem(LS_ROLE, r);
    else localStorage.removeItem(LS_ROLE);
  }

  function logout() {
    setToken(null);
    setUserEmail(null);
    setRole(null);
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_EMAIL);
    localStorage.removeItem(LS_ROLE);
  }

  const value = useMemo(() => ({ token, userEmail, role, login, logout }), [token, userEmail, role]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
