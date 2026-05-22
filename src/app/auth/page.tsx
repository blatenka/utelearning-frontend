"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

type AuthMode = "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab");

    if (tab === "register") {
      setMode("register");
    } else {
      setMode("login");
    }
  }, [searchParams]);

  const title = useMemo(
    () => (mode === "register" ? "Create your account" : "Welcome back"),
    [mode],
  );

  const subtitle = useMemo(
    () =>
      mode === "register"
        ? "Start learning with your personal account."
        : "Sign in to continue to your learning dashboard.",
    [mode],
  );

  const submitText = useMemo(
    () => (mode === "register" ? "Create account" : "Sign in"),
    [mode],
  );

  const loadingText = useMemo(
    () => (mode === "register" ? "Creating account..." : "Signing in..."),
    [mode],
  );

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);

    const url = nextMode === "register" ? "/auth?tab=register" : "/auth?tab=login";
    router.replace(url);
  }

  function getErrorMessage(err: any) {
    const message = err?.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(", ");
    }

    if (typeof message === "string") {
      return message;
    }

    return mode === "register" ? "Register failed" : "Login failed";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError(null);

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (!password.trim()) {
      setError("Password is required.");
      return;
    }

    if (mode === "register" && !fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    try {
      setLoading(true);

      if (mode === "login") {
        await login({
          email: email.trim(),
          password,
        });
      } else {
        await register({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
        });
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    window.location.href = `${backendUrl}/auth/google`;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 px-4 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-6xl items-center gap-8 lg:grid-cols-2">
        <section className="hidden lg:block">
          <div className="rounded-[2rem] bg-zinc-950 p-10 text-white shadow-2xl">
            <div className="mb-12 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/80">
              UTE-Learning Platform
            </div>

            <h1 className="max-w-xl text-5xl font-bold tracking-tight">
              Learn smarter, manage courses easier.
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-zinc-300">
              Access your courses, manage your profile, and continue your
              learning journey with a clean and modern dashboard.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <div className="text-2xl font-semibold">24/7</div>
                <div className="mt-1 text-sm text-zinc-300">Access</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <div className="text-2xl font-semibold">Cloud</div>
                <div className="mt-1 text-sm text-zinc-300">Storage</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <div className="text-2xl font-semibold">Admin</div>
                <div className="mt-1 text-sm text-zinc-300">Control</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="rounded-[2rem] border border-zinc-200 bg-white/90 p-6 shadow-xl backdrop-blur sm:p-8">
            <div className="mb-8">
              <div className="mb-6 grid grid-cols-2 rounded-full bg-zinc-100 p-1">
                <button
                  type="button"
                  onClick={() => changeMode("login")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    mode === "login"
                      ? "bg-white text-zinc-950 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                  disabled={loading}
                >
                  Login
                </button>

                <button
                  type="button"
                  onClick={() => changeMode("register")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    mode === "register"
                      ? "bg-white text-zinc-950 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                  disabled={loading}
                >
                  Register
                </button>
              </div>

              <h2 className="text-3xl font-bold tracking-tight text-zinc-950">
                {title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                {subtitle}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === "register" && (
                <div className="space-y-2">
                  <label
                    htmlFor="fullName"
                    className="text-sm font-medium text-zinc-700"
                  >
                    Full name
                  </label>

                  <input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10 disabled:cursor-not-allowed disabled:bg-zinc-100"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-zinc-700"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-zinc-700"
                  >
                    Password
                  </label>

                  {mode === "login" && (
                    <button
                      type="button"
                      className="text-xs font-medium text-zinc-500 hover:text-zinc-950"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? loadingText : submitText}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-200" />
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                or continue with
              </span>
              <div className="h-px flex-1 bg-zinc-200" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>

              Google
            </button>

            <p className="mt-6 text-center text-sm text-zinc-500">
              {mode === "register"
                ? "Already have an account?"
                : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() =>
                  changeMode(mode === "login" ? "register" : "login")
                }
                disabled={loading}
                className="font-semibold text-zinc-950 underline-offset-4 hover:underline disabled:cursor-not-allowed"
              >
                {mode === "register" ? "Sign in" : "Create one"}
              </button>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}