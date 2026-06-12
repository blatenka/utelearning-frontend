"use client";

import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";

export default function ReviewerDashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-sm text-zinc-500">Loading...</p>
      </main>
    );
  }

  if (!user || user.role !== "REVIEWER") {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-zinc-900">
            Access denied
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            You need to sign in as a reviewer to access this page.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          Reviewer Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Welcome back, {user.fullName}. Review submitted courses and manage
          your pending tasks.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">
            Available Courses
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            View courses that are available for you to claim based on your
            authorized categories.
          </p>

          <Link
            href="/reviewer/courses/available"
            className="mt-5 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            Browse Available Courses
          </Link>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">
            My Review Tasks
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Continue reviewing courses you have already claimed.
          </p>

          <Link
            href="/reviewer/courses"
            className="mt-5 inline-flex rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Open My Tasks
          </Link>
        </div>
      </div>
    </main>
  );
}