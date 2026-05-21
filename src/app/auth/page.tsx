"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

export default function AuthPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "register") {
      setMode("register");
    }
  }, []);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => (mode === "register" ? "Register" : "Login"), [mode]);
  const submitText = useMemo(() => (mode === "register" ? "Create account" : "Sign in"), [mode]);
  const toggleText = useMemo(
    () =>
      mode === "register"
        ? "Already have an account?"
        : "Don't have an account?",
    [mode],
  );
  const toggleLinkText = useMemo(() => (mode === "register" ? "Login" : "Register"), [mode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        await login({ email, password });
      } else {
        await register({ fullName, email, password });
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.message || `${title} failed`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded shadow">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="space-x-2">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-full px-3 py-1 text-sm ${mode === "login" ? "bg-primary text-white" : "bg-zinc-100 text-zinc-700"}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`rounded-full px-3 py-1 text-sm ${mode === "register" ? "bg-primary text-white" : "bg-zinc-100 text-zinc-700"}`}
          >
            Register
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === "register" && (
          <input
            className="border p-2 rounded"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
          />
        )}
        <input
          className="border p-2 rounded"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        <input
          className="border p-2 rounded"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
        {error && <div className="text-red-500">{error}</div>}
        <button
          type="submit"
          className="rounded bg-primary px-4 py-2 text-white hover:bg-primary/90 disabled:opacity-70"
          disabled={loading}
        >
          {submitText}
        </button>
      </form>

      <div className="mt-4 text-sm text-zinc-600">
        {toggleText}{" "}
        <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")} className="text-primary underline">
          {toggleLinkText}
        </button>
      </div>
    </div>
  );
}
