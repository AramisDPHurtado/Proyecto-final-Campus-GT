import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, getToken, jsonBody, saveToken, type PublicUser } from "./api";

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login(email: string, password: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<void>;
  logout(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    api<{ user: PublicUser }>("/api/auth/me")
      .then((result) => setUser(result.user))
      .catch(() => saveToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const result = await api<{ user: PublicUser; token: string }>(
      "/api/auth/login",
      { method: "POST", body: jsonBody({ email, password }) },
      false
    );
    saveToken(result.token);
    setUser(result.user);
  }

  async function register(name: string, email: string, password: string) {
    const result = await api<{ user: PublicUser; token: string }>(
      "/api/auth/register",
      { method: "POST", body: jsonBody({ name, email, password }) },
      false
    );
    saveToken(result.token);
    setUser(result.user);
  }

  function logout() {
    saveToken(null);
    setUser(null);
  }

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth necesita AuthProvider.");
  return context;
}
