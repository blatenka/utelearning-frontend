"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpenCheck,
  ClipboardList,
  ShieldCheck,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/providers/AuthProvider";

type ModalState = {
  open: boolean;
  title: string;
  message: string;
  variant: "info" | "warning" | "success" | "danger";
};

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
  const [modal, setModal] = useState<ModalState>({
    open: false,
    title: "",
    message: "",
    variant: "info",
  });

  const closeModal = () => {
    setModal({
      open: false,
      title: "",
      message: "",
      variant: "info",
    });
  };

  const openGuideModal = () => {
    setModal({
      open: true,
      title: "Reviewer workflow",
      message:
        "Your job is to check submitted courses carefully before making a decision. Use My Review Tasks to review claimed courses. Use Available Courses to claim new courses that match your authorized categories.",
      variant: "info",
    });
  };

  const openDecisionModal = () => {
    setModal({
      open: true,
      title: "Review decisions",
      message:
        "Approve means the course is accepted. Request Changes means the instructor can read your note and update the course. Reject means the course may be archived, so you should always write a clear reason before rejecting.",
      variant: "warning",
    });
  };

  const getModalIconStyle = () => {
    if (modal.variant === "success") {
      return "bg-green-100 text-green-700";
    }

    if (modal.variant === "warning") {
      return "bg-yellow-100 text-yellow-700";
    }

    if (modal.variant === "danger") {
      return "bg-red-100 text-red-700";
    }

    return "bg-blue-100 text-blue-700";
  };

  const getModalButtonStyle = () => {
    if (modal.variant === "success") {
      return "bg-green-600 hover:bg-green-700";
    }

    if (modal.variant === "warning") {
      return "bg-yellow-600 hover:bg-yellow-700";
    }

    if (modal.variant === "danger") {
      return "bg-red-600 hover:bg-red-700";
    }

    return "bg-blue-600 hover:bg-blue-700";
  };

  const getModalIcon = () => {
    if (modal.variant === "success") {
      return <CheckCircle2 className="h-6 w-6" />;
    }

    if (modal.variant === "warning") {
      return <AlertTriangle className="h-6 w-6" />;
    }

    if (modal.variant === "danger") {
      return <XCircle className="h-6 w-6" />;
    }

    return <Info className="h-6 w-6" />;
  };

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

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={openGuideModal}
                  className="inline-flex items-center rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
                >
                  <Info className="mr-2 h-4 w-4" />
                  How review works
                </button>

                <button
                  type="button"
                  onClick={openDecisionModal}
                  className="inline-flex items-center rounded-lg border border-yellow-300/30 bg-yellow-400/10 px-4 py-2 text-sm font-medium text-yellow-100 transition hover:bg-yellow-400/20"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Decision rules
                </button>
              </div>
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
          <div className="rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-400 hover:shadow-md">
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

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/reviewer/courses"
                className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
              >
                Go to my tasks
              </Link>

              <button
                type="button"
                onClick={() =>
                  setModal({
                    open: true,
                    title: "My Review Tasks",
                    message:
                      "This page shows courses you have already claimed. Open a task to inspect course details, curriculum, lessons, media files, and submit your review decision.",
                    variant: "info",
                  })
                }
                className="inline-flex rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                Details
              </button>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-400 hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white">
              <BookOpenCheck className="h-6 w-6" />
            </div>

            <h2 className="mt-5 text-xl font-semibold text-zinc-900">
              Available Courses
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Browse unclaimed courses that match your authorized categories and
              claim a course when you are ready to review it.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/reviewer/courses/available"
                className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
              >
                Browse available courses
              </Link>

              <button
                type="button"
                onClick={() =>
                  setModal({
                    open: true,
                    title: "Available Courses",
                    message:
                      "Only claim a course when you are ready to review it. After claiming, the course will move to your review tasks and you can open the workspace to inspect it.",
                    variant: "warning",
                  })
                }
                className="inline-flex rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                Details
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <BookOpenCheck className="h-5 w-5" />
          </div>

          <p className="mt-4 text-sm font-medium text-zinc-900">Step 1</p>
          <p className="mt-1 text-sm text-zinc-500">
            Claim a course from the available list.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
            <ClipboardList className="h-5 w-5" />
          </div>

          <p className="mt-4 text-sm font-medium text-zinc-900">Step 2</p>
          <p className="mt-1 text-sm text-zinc-500">
            Review course information, sections, lessons, and media.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-700">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <p className="mt-4 text-sm font-medium text-zinc-900">Step 3</p>
          <p className="mt-1 text-sm text-zinc-500">
            Approve, reject, or request changes from the instructor.
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Decision guide
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Use these rules before sending your final review decision.
            </p>
          </div>

          <button
            type="button"
            onClick={openDecisionModal}
            className="inline-flex rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
          >
            Read rules
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-green-800">
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </div>
            <p className="mt-2 text-sm leading-6 text-green-800">
              Use this when the course content, curriculum, media files, and
              basic information are acceptable.
            </p>
          </div>

          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-yellow-800">
              <RefreshCw className="h-4 w-4" />
              Request Changes
            </div>
            <p className="mt-2 text-sm leading-6 text-yellow-800">
              Use this when the instructor should fix some issues. A clear note
              is required so the instructor knows what to improve.
            </p>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
              <XCircle className="h-4 w-4" />
              Reject
            </div>
            <p className="mt-2 text-sm leading-6 text-red-800">
              Use this only for serious issues. Rejected courses may be archived,
              so write a clear reason for the instructor.
            </p>
          </div>
        </div>
      </section>

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl">
            <div
              className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${getModalIconStyle()}`}
            >
              {getModalIcon()}
            </div>

            <h2 className="text-lg font-semibold text-zinc-900">
              {modal.title}
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {modal.message}
            </p>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={closeModal}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${getModalButtonStyle()}`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}