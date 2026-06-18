"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

type AuthMode = "login" | "register";

const GENDERS = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"] as const;

function EyeIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61C3.8 8.51 2 12 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register } = useAuth();

  const redirect = useMemo(() => {
    const value = searchParams.get("redirect");

    if (!value) return "/dashboard";

    if (!value.startsWith("/") || value.startsWith("//")) {
      return "/dashboard";
    }

    return value;
  }, [searchParams]);

  const [mode, setMode] = useState<AuthMode>("login");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

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
    [mode]
  );

  const subtitle = useMemo(
    () =>
      mode === "register"
        ? "Start learning with your personal account."
        : "Sign in to continue to your learning dashboard.",
    [mode]
  );

  const submitText = useMemo(
    () => (mode === "register" ? "Create account" : "Sign in"),
    [mode]
  );

  const loadingText = useMemo(
    () => (mode === "register" ? "Creating account..." : "Signing in..."),
    [mode]
  );

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setConfirmPassword("");

    const params = new URLSearchParams();
    params.set("tab", nextMode);

    const currentRedirect = searchParams.get("redirect");

    if (
      currentRedirect &&
      currentRedirect.startsWith("/") &&
      !currentRedirect.startsWith("//")
    ) {
      params.set("redirect", currentRedirect);
    }

    router.replace(`/auth?${params.toString()}`);
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

    if (mode === "register" && !confirmPassword.trim()) {
      setError("Please confirm your password.");
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }

    if (mode === "register" && dateOfBirth) {
      const parsedDate = new Date(dateOfBirth);

      if (Number.isNaN(parsedDate.getTime())) {
        setError("Date of birth is invalid.");
        return;
      }
    }

    try {
      setLoading(true);

      if (mode === "login") {
        await login({
          email: email.trim(),
          password,
        });
      } else {
        const registerPayload: any = {
          fullName: fullName.trim(),
          email: email.trim(),
          password,
        };

        if (dateOfBirth) {
          registerPayload.dateOfBirth = new Date(dateOfBirth).toISOString();
        }

        if (gender) {
          registerPayload.gender = gender;
        }

        if (phoneNumber.trim()) {
          registerPayload.phoneNumber = phoneNumber.trim();
        }

        await register(registerPayload);
      }

      router.replace(redirect);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

    const googleAuthUrl = `${backendUrl}/v1/auth/google`;
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      googleAuthUrl,
      "google-login",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      setError("Please allow popups for Google login");
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === "GOOGLE_LOGIN_SUCCESS") {
        const token = event.data.token;

        if (token) {
          localStorage.setItem("accessToken", token);

          if (event.data.user) {
            localStorage.setItem("user", JSON.stringify(event.data.user));
          }

          popup.close();
          window.removeEventListener("message", handleMessage);
          router.replace(redirect);
        }
      } else if (event.data.type === "GOOGLE_LOGIN_ERROR") {
        setError(event.data.message || "Google login failed");
        popup.close();
        window.removeEventListener("message", handleMessage);
      }
    };

    window.addEventListener("message", handleMessage);

    const popupCheckInterval = setInterval(() => {
      if (popup.closed) {
        clearInterval(popupCheckInterval);
        window.removeEventListener("message", handleMessage);
      }
    }, 1000);
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

              {redirect !== "/dashboard" && (
                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  After signing in, you will return to your selected course.
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === "register" && (
                <>
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

                  <div className="space-y-2">
                    <label
                      htmlFor="dateOfBirth"
                      className="text-sm font-medium text-zinc-700"
                    >
                      Date of birth
                    </label>

                    <input
                      id="dateOfBirth"
                      type="datetime-local"
                      value={dateOfBirth}
                      onChange={(e) => {setDateOfBirth(e.target.value)}}
                      disabled={loading}
                      className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10 disabled:cursor-not-allowed disabled:bg-zinc-100"
                    />

                    <p className="text-xs text-zinc-500">
                      Please select both date and time.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="gender"
                      className="text-sm font-medium text-zinc-700"
                    >
                      Gender
                    </label>

                    <select
                      id="gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      disabled={loading}
                      className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10 disabled:cursor-not-allowed disabled:bg-zinc-100"
                    >
                      <option value="">Select gender</option>
                      {GENDERS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="phoneNumber"
                      className="text-sm font-medium text-zinc-700"
                    >
                      Phone number
                    </label>

                    <input
                      id="phoneNumber"
                      type="tel"
                      placeholder="Enter your phone number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={loading}
                      className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10 disabled:cursor-not-allowed disabled:bg-zinc-100"
                    />
                  </div>
                </>
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

                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 pr-12 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10 disabled:cursor-not-allowed disabled:bg-zinc-100"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={loading}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 disabled:cursor-not-allowed"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {mode === "register" && (
                <div className="space-y-2">
                  <label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium text-zinc-700"
                  >
                    Confirm password
                  </label>

                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Enter your password again"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 pr-12 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10 disabled:cursor-not-allowed disabled:bg-zinc-100"
                    />

                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      disabled={loading}
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 disabled:cursor-not-allowed"
                    >
                      {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>
              )}

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