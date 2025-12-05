// contexts/AuthContext.tsx
import { decodeJwt } from "@/utils/jwt";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type UserType = {
  id?: string | null;
  name?: string;
  email?: string;
  role?: string;
};

type AuthState = {
  user: UserType | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (payload: { token: string; user?: UserType }) => Promise<void>;
  logout: () => Promise<void>;
  setUserFromToken: (token: string) => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // load token from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem("token");
        if (t) {
          setTokenState(t);
          axios.defaults.headers.common["Authorization"] = `Bearer ${t}`;
          // decode user
          const data = decodeJwt(t);
          if (data) {
            const u: UserType = {
              id: data.userId || data.id || null,
              name: data.username || data.name || "",
              email: data.email || "",
              role: data.role || "user",
            };
            setUser(u);
          }
        }
      } catch (e) {
        console.warn("AuthProvider load token error", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async ({ token: t, user: u }: { token: string; user?: UserType }) => {
    // store token
    await AsyncStorage.setItem("token", t);
    setTokenState(t);
    axios.defaults.headers.common["Authorization"] = `Bearer ${t}`;
    if (u) {
      setUser(u);
    } else {
      const decoded = decodeJwt(t);
      if (decoded) {
        setUser({
          id: decoded.userId || decoded.id || null,
          name: decoded.username || decoded.name || "",
          email: decoded.email || "",
          role: decoded.role || "user",
        });
      }
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem("token");
    setTokenState(null);
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];
    // optional: call API to logout
  };

  const setUserFromToken = (tkn: string) => {
    const decoded = decodeJwt(tkn);
    if (!decoded) return;
    const u: UserType = {
      id: decoded.userId || decoded.id || null,
      name: decoded.username || decoded.name || "",
      email: decoded.email || "",
      role: decoded.role || "user",
    };
    setUser(u);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!token,
      loading,
      login,
      logout,
      setUserFromToken,
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
