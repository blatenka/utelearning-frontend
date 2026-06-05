"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

function parseUser(value: string | null) {
  if (!value) return null;

  try {
    return JSON.parse(decodeURIComponent(value));
  } catch {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
}

export default function GoogleCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    const token = urlParams.get("token");
    const userData = urlParams.get("user");

    if (!token) {
      window.opener?.postMessage(
        {
          type: "GOOGLE_LOGIN_ERROR",
          message: "Google login failed. Missing access token.",
        },
        window.location.origin
      );

      setTimeout(() => {
        if (window.opener) {
          window.close();
        } else {
          router.replace("/auth?tab=login");
        }
      }, 1500);

      return;
    }

    const parsedUser = parseUser(userData);

    if (window.opener) {
      window.opener.postMessage(
        {
          type: "GOOGLE_LOGIN_SUCCESS",
          token,
          user: parsedUser,
        },
        window.location.origin
      );

      setTimeout(() => {
        window.close();
      }, 500);

      return;
    }

    localStorage.setItem("accessToken", token);

    if (parsedUser) {
      localStorage.setItem("user", JSON.stringify(parsedUser));
    }

    router.replace("/");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-zinc-100">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-zinc-950" />
        <p className="text-zinc-600">Completing Google login...</p>
      </div>
    </div>
  );
}