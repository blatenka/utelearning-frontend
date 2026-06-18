"use client";

import Link from "next/link";
import { BookOpenCheck, ClipboardList, ShieldCheck } from "lucide-react";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/providers/AuthProvider";

export default function ReviewerPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-sm text-zinc-500">Loading...</p>
      </main>
    );
  }

  return (
    <RoleGuard allowedRoles={["REVIEWER"]}>
      <ReviewerDashboard
        fullName={user?.fullName || "Reviewer"}
        email={user?.email || "No email"}
        role={user?.role || "REVIEWER"}
      />
    </RoleGuard>
  );
}

function ReviewerDashboard({
  fullName,
  email,
  role,
}: {
  fullName: string;
  email: string;
  role: string;
}) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="bg-zinc-950 px-6 py-10 text-white md:px-10">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-zinc-200">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Reviewer Workspace
              </div>

              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Welcome back, {fullName}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
                Review submitted courses, claim available tasks, check course
                content, curriculum, media files, and submit your final review
                decision.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-sm text-zinc-300">Signed in as</p>
              <p className="mt-1 font-semibold text-white">{email}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-zinc-400">
                {role}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-6 md:grid-cols-2 md:p-10">
          <Link
            href="/reviewer/courses"
            className="group rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-400 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white">
              <ClipboardList className="h-6 w-6" />
            </div>

            <h2 className="mt-5 text-xl font-semibold text-zinc-900">
              My Review Tasks
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              View courses you have already claimed. Open the review workspace
              to inspect course details and submit a decision.
            </p>

            <div className="mt-5 text-sm font-medium text-zinc-900 group-hover:underline">
              Go to my tasks →
            </div>
          </Link>

          <Link
            href="/reviewer/courses/available"
            className="group rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-400 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white">
              <BookOpenCheck className="h-6 w-6" />
            </div>

            <h2 className="mt-5 text-xl font-semibold text-zinc-900">
              Available Courses
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Browse unclaimed courses that match your authorized categories
              and claim a course when you are ready to review it.
            </p>

            <div className="mt-5 text-sm font-medium text-zinc-900 group-hover:underline">
              Browse available courses →
            </div>
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-5 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-zinc-900">Step 1</p>
          <p className="mt-1 text-sm text-zinc-500">
            Claim a course from the available list.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-zinc-900">Step 2</p>
          <p className="mt-1 text-sm text-zinc-500">
            Review course information, sections, lessons, and media.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-zinc-900">Step 3</p>
          <p className="mt-1 text-sm text-zinc-500">
            Approve, reject, or request changes from the instructor.
          </p>
        </div>
      </section>
    </main>
  );
}