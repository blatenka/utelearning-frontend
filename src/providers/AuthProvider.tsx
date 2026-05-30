"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

type Gender = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";

type User = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string;
  gender?: Gender;
  dateOfBirth?: string;
  phoneNumber?: string;
} | null;

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
  dateOfBirth?: string;
  gender?: Gender;
  phoneNumber?: string;
};

type AuthContextValue = {
  user: User;
  accessToken: string | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User>(null);
  const [accessToken, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("accessToken");
      const savedUser = localStorage.getItem("user");

      if (!token) {
        setLoading(false);
        return;
      }

      setToken(token);

      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          localStorage.removeItem("user");
        }
      }

      try {
        await refreshMe();
      } catch {
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  async function login(payload: LoginPayload) {
    const res = await api.post("/v1/auth/login", payload);

    const token = res.data.data.accessToken;

    setToken(token);
    localStorage.setItem("accessToken", token);

    await refreshMe();
  }

  async function register(payload: RegisterPayload) {
    const res = await api.post("/v1/auth/register", payload);

    const token = res.data.data.accessToken;

    setToken(token);
    localStorage.setItem("accessToken", token);

    await refreshMe();
  }

  async function logout() {
    try {
      await api.post("/v1/auth/logout");
    } catch {}

    clearAuth();
  }

  function clearAuth() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");

    setToken(null);
    setUser(null);
  }

  async function refreshMe() {
    const res = await api.get("/v1/users/me");

    setUser(res.data.data);
    localStorage.setItem("user", JSON.stringify(res.data.data));
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        login,
        register,
        logout,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
}