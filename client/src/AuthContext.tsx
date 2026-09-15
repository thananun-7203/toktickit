import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  AuthUser,
  changePassword as changePasswordApi,
  getCurrentUser,
  login as loginApi,
  logout as logoutApi,
} from "./api.js";

type AuthState = "loading" | "authenticated" | "unauthenticated" | "error";

interface AuthContextValue {
  state: AuthState;
  user: AuthUser | null;
  bootstrapError: string | null;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  changePassword: (input: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<AuthUser>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setState("loading");
    setBootstrapError(null);
    try {
      const current = await getCurrentUser();
      setUser(current);
      setState("authenticated");
    } catch (err) {
      setUser(null);
      if (err instanceof ApiError && err.status === 401) {
        setState("unauthenticated");
        return;
      }
      setBootstrapError("Unable to verify your session. Please try again.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(() => ({
    state,
    user,
    bootstrapError,
    async signIn(email, password) {
      const result = await loginApi(email, password);
      setUser(result.user);
      setState("authenticated");
      setBootstrapError(null);
      return result.user;
    },
    async signOut() {
      try {
        await logoutApi();
      } finally {
        setUser(null);
        setState("unauthenticated");
      }
    },
    async changePassword(input) {
      const result = await changePasswordApi(input);
      setUser(result.user);
      setState("authenticated");
      return result.user;
    },
    refresh,
  }), [bootstrapError, refresh, state, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
