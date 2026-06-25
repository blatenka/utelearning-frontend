"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, MessageSquareText } from "lucide-react";
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

type AlertModalState = {
  open: boolean;
  title: string;
  message: string;
  variant: "success" | "error" | "info" | "warning";
};

type ReviewNoteModalState = {
  open: boolean;
  task: ReviewerReviewTask | null;
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

function getErrorMessage(err: unknown, fallback: string) {
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof (err as any).response?.data?.message === "string"
  ) {
    return (err as any).response.data.message;
  }

  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    Array.isArray((err as any).response?.data?.message)
  ) {
    return (err as any).response.data.message.join(", ");
  }

  if (err instanceof Error) {
    return err.message;
  }

  return fallback;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusStyle(status: string) {
  const normalizedStatus = status.toUpperCase();

  if (normalizedStatus === "APPROVED") {
    return "bg-green-50 text-green-700";
  }

  if (normalizedStatus === "REJECTED") {
    return "bg-red-50 text-red-700";
  }

  if (normalizedStatus === "CHANGES_REQUESTED") {
    return "bg-yellow-50 text-yellow-700";
  }

  return "bg-purple-50 text-purple-700";
}

export default function ReviewerCoursesPage() {
  const [tasks, setTasks] = useState<ReviewerReviewTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [alertModal, setAlertModal] = useState<AlertModalState>({
    open: false,
    title: "",
    message: "",
    variant: "info",
  });

  const [reviewNoteModal, setReviewNoteModal] =
    useState<ReviewNoteModalState>({
      open: false,
      task: null,
    });

  const filteredTasks = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return tasks;

    return tasks.filter((task) =>
      `${getCourseTitle(task)} ${getCourseDescription(task)}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [tasks, search]);

  const closeAlertModal = () => {
    setAlertModal({
      open: false,
      title: "",
      message: "",
      variant: "info",
    });
  };

  const showModal = (
    title: string,
    message: string,
    variant: AlertModalState["variant"] = "info"
  ) => {
    setAlertModal({
      open: true,
      title,
      message,
      variant,
    });
  };

  const closeReviewNoteModal = () => {
    setReviewNoteModal({
      open: false,
      task: null,
    });
  };

  async function fetchMyTasks() {
    try {
      setLoading(true);

      const response = await reviewerCourseService.getMyReviewTasks({
        page: 1,
        limit: 30,
      });

      const list = unwrapList<ReviewerReviewTask>(response);

      setTasks(Array.isArray(list) ? list : []);
    } catch (err) {
      showModal(
        "Failed to load review tasks",
        getErrorMessage(err, "Failed to load review tasks."),
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleMissingReviewId() {
    showModal(
      "Missing review ID",
      "This review task does not have a valid review ID, so the workspace cannot be opened.",
      "error"
    );
  }

  function handleOpenReviewNote(task: ReviewerReviewTask) {
    setReviewNoteModal({
      open: true,
      task,
    });
  }

  function getAlertIconStyle() {
    if (alertModal.variant === "success") {
      return "bg-green-100 text-green-700";
    }

    if (alertModal.variant === "error") {
      return "bg-red-100 text-red-700";
    }

    if (alertModal.variant === "warning") {
      return "bg-yellow-100 text-yellow-700";
    }

    return "bg-blue-100 text-blue-700";
  }

  function getAlertButtonStyle() {
    if (alertModal.variant === "success") {
      return "bg-green-600 hover:bg-green-700";
    }

    if (alertModal.variant === "error") {
      return "bg-red-600 hover:bg-red-700";
    }

    if (alertModal.variant === "warning") {
      return "bg-yellow-600 hover:bg-yellow-700";
    }

    return "bg-blue-600 hover:bg-blue-700";
  }

  function getAlertIcon() {
    if (alertModal.variant === "success") return "✓";
    if (alertModal.variant === "error") return "!";
    if (alertModal.variant === "warning") return "!";
    return "i";
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

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusStyle(
                                status
                              )}`}
                            >
                              {status}
                            </span>
                          </div>

                          <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                            {description}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenReviewNote(task)}
                            className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                          >
                            <MessageSquareText className="mr-2 h-4 w-4" />
                            Note
                          </button>

                          {reviewId ? (
                            <Link
                              href={`/reviewer/courses/${reviewId}`}
                              className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Open Workspace
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={handleMissingReviewId}
                              className="inline-flex items-center rounded-lg bg-zinc-300 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-400"
                            >
                              Missing Review ID
                            </button>
                          )}
                        </div>
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
                            Submitted at: {formatDateTime(task.submittedAt)}
                          </p>
                        )}

                        {task.reviewedAt && (
                          <p className="mt-1">
                            Reviewed at: {formatDateTime(task.reviewedAt)}
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

        {reviewNoteModal.open && reviewNoteModal.task && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-xl rounded-2xl border bg-white p-6 shadow-2xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <MessageSquareText className="h-6 w-6" />
              </div>

              <h2 className="text-lg font-semibold text-zinc-900">
                Review task note
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                {getCourseTitle(reviewNoteModal.task)}
              </p>

              <div className="mt-5 grid gap-3 rounded-xl border bg-zinc-50 p-4 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase text-zinc-500">
                    Status
                  </p>
                  <p className="mt-1 font-medium text-zinc-800">
                    {getTaskStatus(reviewNoteModal.task)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase text-zinc-500">
                    Submitted at
                  </p>
                  <p className="mt-1 font-medium text-zinc-800">
                    {formatDateTime(reviewNoteModal.task.submittedAt)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase text-zinc-500">
                    Reviewed at
                  </p>
                  <p className="mt-1 font-medium text-zinc-800">
                    {formatDateTime(reviewNoteModal.task.reviewedAt)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-sm font-semibold text-yellow-900">
                  Reviewer note
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-yellow-900">
                  {reviewNoteModal.task.reviewNote?.trim() ||
                    "No note has been added for this review task."}
                </p>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={closeReviewNoteModal}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {alertModal.open && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl">
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold ${getAlertIconStyle()}`}
              >
                {getAlertIcon()}
              </div>

              <h2 className="text-lg font-semibold text-zinc-900">
                {alertModal.title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {alertModal.message}
              </p>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={closeAlertModal}
                  className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${getAlertButtonStyle()}`}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </RoleGuard>
  );
}