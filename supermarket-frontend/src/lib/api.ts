import axios from "axios";
import { useAuth } from "../styles/auth";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? "/api",
});

// Automatically attach token if logged in
api.interceptors.request.use((config) => {
  const token = useAuth.getState().token;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
