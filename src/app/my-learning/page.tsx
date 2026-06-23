"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Clock, CreditCard, PlayCircle } from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";
import {
  enrollmentService,
  unwrapData,
} from "@/services/enrollment.service";

import type {
  EnrollmentResponse,
  PaginatedEnrollmentResponse,
  PaginationMeta,
} from "@/services/enrollment.service";

function formatPrice(price?: number | null) {
  if (!price) return "Free";

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(value?: string | null) {
  if (!value) return "Unknown";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function normalizeEnrollmentPage(response: any): {
  data: EnrollmentResponse[];
  meta?: PaginationMeta;
} {
  const payload = unwrapData<PaginatedEnrollmentResponse | EnrollmentResponse[]>(
    response
  );

  if (Array.isArray(payload)) {
    return {
      data: payload,
      meta: undefined,
    };
  }

  return {
    data: payload?.data ?? [],
    meta: payload?.meta,
  };
}

export default function MyLearningPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [enrollments, setEnrollments] = useState<EnrollmentResponse[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totalCourses = useMemo(() => {
    return meta?.totalItems ?? enrollments.length;
  }, [meta?.totalItems, enrollments.length]);

  async function fetchMyEnrollments() {
    try {
      setLoading(true);
      setError("");

      const response = await enrollmentService.getMyEnrollments({
        page,
        limit: 10,
      });

      const payload = normalizeEnrollmentPage(response);

      setEnrollments(payload.data);
      setMeta(payload.meta);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load your enrolled courses."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace(
        `/auth?tab=login&redirect=${encodeURIComponent("/my-learning")}`
      );
      return;
    }

    fetchMyEnrollments();
  }, [authLoading, user, page]);

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-zinc-500">Checking authentication...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-indigo-600">My Learning</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
            Your enrolled courses
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Continue learning and track your progress.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {Array.isArray(error) ? error.join(", ") : error}
          </div>
        )}

        <div className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-zinc-500">Total enrolled courses</p>
              <p className="text-2xl font-bold text-zinc-950">
                {totalCourses}
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
            >
              Browse more courses
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2">
            {[...Array(4)].map((_, index) => (
              <div
                key={index}
                className="h-64 animate-pulse rounded-2xl border bg-white"
              />
            ))}
          </div>
        ) : enrollments.length === 0 ? (
          <div className="rounded-2xl border bg-white px-6 py-16 text-center shadow-sm">
            <BookOpen className="mx-auto h-10 w-10 text-zinc-300" />
            <h2 className="mt-4 text-lg font-semibold text-zinc-900">
              No enrolled courses yet
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Browse courses and enroll to start learning.
            </p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-5 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700"
            >
              Explore courses
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2">
              {enrollments.map((enrollment) => {
                const course = enrollment.course;
                const progress = Number(enrollment.progressPercentage ?? 0);

                return (
                  <div
                    key={enrollment.id}
                    className="overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div className="aspect-video bg-zinc-100">
                      {course?.thumbnailUrl ? (
                        <img
                          src={course.thumbnailUrl}
                          alt={course.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                          No thumbnail
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="mb-2 flex flex-wrap gap-2">
                        {course?.level && (
                          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                            {course.level}
                          </span>
                        )}

                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          Enrolled
                        </span>
                      </div>

                      <h2 className="line-clamp-2 text-lg font-semibold text-zinc-950">
                        {course?.title || "Untitled course"}
                      </h2>

                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500">
                        {course?.shortDescription || "No description."}
                      </p>

                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-500">Progress</span>
                          <span className="font-medium text-zinc-900">
                            {progress.toFixed(0)}%
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full rounded-full bg-zinc-900"
                            style={{
                              width: `${Math.min(Math.max(progress, 0), 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 text-sm text-zinc-500 sm:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {formatDate(
                            enrollment.enrolledAt ?? enrollment.createdAt
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          {enrollment.payment?.status ||
                            formatPrice(course?.price)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (course?.id) {
                            router.push(`/learning/courses/${course.id}`);
                          }
                        }}
                        disabled={!course?.id}
                        className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Continue Learning
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {meta && (meta.hasPreviousPage || meta.hasNextPage) && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={!meta.hasPreviousPage}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="rounded-xl border bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                <span className="text-sm text-zinc-500">
                  Page {meta.page}
                  {meta.totalPages ? ` / ${meta.totalPages}` : ""}
                </span>

                <button
                  type="button"
                  disabled={!meta.hasNextPage}
                  onClick={() => setPage((value) => value + 1)}
                  className="rounded-xl border bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}