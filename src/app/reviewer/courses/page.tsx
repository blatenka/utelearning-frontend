"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import {
  reviewerCourseService,
  unwrapList,
} from "@/services/review.service";
import RoleGuard from "@/components/RoleGuard";

type CourseCategorySummary = {
  id: string;
  name: string;
  slug?: string | null;
};

type CourseInstructorSummary = {
  id: string;
  fullName: string;
  email?: string | null;
  avatarUrl?: string | null;
};

type ReviewCourse = {
  id: string;
  title: string;
  shortDescription?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  level?: string | null;
  categories?: CourseCategorySummary[];
  instructors?: CourseInstructorSummary[];
};

type ReviewerReviewTask = {
  reviewId: string;
  reviewStatus: string;
  reviewNote?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  course: ReviewCourse;
};

function getCourseTitle(task: ReviewerReviewTask) {
  return task.course?.title || "Untitled course";
}

function getCourseDescription(task: ReviewerReviewTask) {
  return task.course?.shortDescription || "No short description.";
}

function getCourseThumbnail(task: ReviewerReviewTask) {
  return task.course?.thumbnailUrl || "";
}

function getCourseLevel(task: ReviewerReviewTask) {
  return task.course?.level || "";
}

function getCourseCategories(task: ReviewerReviewTask) {
  return task.course?.categories || [];
}

function getCourseInstructors(task: ReviewerReviewTask) {
  return task.course?.instructors || [];
}

function getTaskStatus(task: ReviewerReviewTask) {
  return task.reviewStatus || "PENDING";
}

export default function ReviewerCoursesPage() {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<ReviewerReviewTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const filteredTasks = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return tasks;

    return tasks.filter((task) =>
      `${getCourseTitle(task)} ${getCourseDescription(task)}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [tasks, search]);

  async function fetchMyTasks() {
    try {
      setLoading(true);
      setError("");

      const response = await reviewerCourseService.getMyReviewTasks({
        page: 1,
        limit: 30,
      });

      const list = unwrapList<ReviewerReviewTask>(response);

      setTasks(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load review tasks.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMyTasks();
  }, []);

  return (
    <RoleGuard allowedRoles={["REVIEWER"]}>
      <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            My Review Tasks
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Courses you have claimed and need to review.
          </p>
        </div>

        <Link
          href="/reviewer/courses/available"
          className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
        >
          Browse Available Courses
        </Link>
      </div>

      <div className="mb-5">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search my review tasks..."
          className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {Array.isArray(error) ? error.join(", ") : error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading review tasks...</p>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            No review tasks
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            You have not claimed any courses yet.
          </p>

          <Link
            href="/reviewer/courses/available"
            className="mt-5 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            Find Available Courses
          </Link>
        </div>
      ) : (
        <div className="grid gap-5">
          {filteredTasks.map((task) => {
            const reviewId = task.reviewId;
            const title = getCourseTitle(task);
            const description = getCourseDescription(task);
            const thumbnailUrl = getCourseThumbnail(task);
            const level = getCourseLevel(task);
            const categories = getCourseCategories(task);
            const instructors = getCourseInstructors(task);
            const status = getTaskStatus(task);

            return (
              <div
                key={reviewId || task.course.id}
                className="overflow-hidden rounded-2xl border bg-white shadow-sm"
              >
                <div className="grid gap-4 p-5 md:grid-cols-[180px_1fr]">
                  <div className="h-36 overflow-hidden rounded-xl bg-zinc-100">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">
                        No thumbnail
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-semibold text-zinc-900">
                            {title}
                          </h2>

                          <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                            {status}
                          </span>
                        </div>

                        <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                          {description}
                        </p>
                      </div>

                      {reviewId ? (
                        <Link
                          href={`/reviewer/courses/${reviewId}`}
                          className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
                        >
                          Open Workspace
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="shrink-0 rounded-lg bg-zinc-300 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed"
                        >
                          Missing Review ID
                        </button>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {level && (
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                          {level}
                        </span>
                      )}

                      {categories.map((category) => (
                        <span
                          key={category.id}
                          className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                        >
                          {category.name}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 text-sm text-zinc-500">
                      {instructors.length > 0 ? (
                        <p>
                          Instructor:{" "}
                          <span className="font-medium text-zinc-700">
                            {instructors
                              .map((instructor) => instructor.fullName)
                              .join(", ")}
                          </span>
                        </p>
                      ) : (
                        <p>Instructor: Not available</p>
                      )}

                      {task.submittedAt && (
                        <p className="mt-1">
                          Submitted at:{" "}
                          {new Date(task.submittedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
    </RoleGuard>
  );
}