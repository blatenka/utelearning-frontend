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
  refreshAccessToken: () => Promise<void>;
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
    const userData = res.data.data.user;

    setToken(token);
    setUser(userData);
    localStorage.setItem("accessToken", token);
    localStorage.setItem("user", JSON.stringify(userData));
  }

  async function register(payload: RegisterPayload) {
    const res = await api.post("/v1/auth/register", payload);

    const token = res.data.data.accessToken;
    const userData = res.data.data.user;

    setToken(token);
    setUser(userData);
    localStorage.setItem("accessToken", token);
    localStorage.setItem("user", JSON.stringify(userData));
  }

  async function logout() {
    try {
      await api.post("/v1/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }

    clearAuth();
  }

  function clearAuth() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");

    setToken(null);
    setUser(null);
  }

  /**
   * Refresh access token using the refresh endpoint
   * This gets called by the API interceptor when 401 is received
   */
  async function refreshAccessToken() {
    try {
      const res = await api.post("/v1/auth/refresh", {});
      const newToken = res.data.data.accessToken;

      setToken(newToken);
      localStorage.setItem("accessToken", newToken);

      return newToken;
    } catch (error) {
      clearAuth();
      throw error;
    }
  }

  /**
   * Refresh user data from the /users/me endpoint
   * Also serves to validate that access token is still valid
   */
  async function refreshMe() {
    const res = await api.get("/v1/users/me");
    const userData = res.data.data;

    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
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
        refreshAccessToken,
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