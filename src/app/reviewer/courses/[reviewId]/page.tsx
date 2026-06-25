"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Info,
  Send,
  XCircle,
} from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";
import {
  reviewerCourseService,
  unwrapData,
} from "@/services/review.service";

import type {
  ReviewDecisionStatus,
  ReviewerCourseReviewWorkspace,
} from "@/services/review.service";

type AlertModalState = {
  open: boolean;
  title: string;
  message: string;
  variant: "success" | "error" | "info" | "warning";
  redirectTo?: string;
};

type ConfirmDecisionModalState = {
  open: boolean;
};

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

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return "Not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(sizeInBytes?: number | null) {
  if (typeof sizeInBytes !== "number" || Number.isNaN(sizeInBytes)) {
    return "";
  }

  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  }

  if (sizeInBytes < 1024 * 1024) {
    return `${Math.round(sizeInBytes / 1024)} KB`;
  }

  return `${(sizeInBytes / 1024 / 1024).toFixed(1)} MB`;
}

function getDecisionLabel(status: ReviewDecisionStatus) {
  if (status === "APPROVED") return "Approve Course";
  if (status === "REJECTED") return "Reject Course";
  return "Request Changes";
}

function getDecisionDescription(status: ReviewDecisionStatus) {
  if (status === "APPROVED") {
    return "This course will be approved. Make sure the course information, curriculum, lessons, and media files are acceptable.";
  }

  if (status === "REJECTED") {
    return "This course will be rejected. Rejected courses may become archived, so the instructor may not be able to edit it again. A clear note is required.";
  }

  return "This course will be sent back to the instructor for updates. A clear note is required so the instructor knows what to improve.";
}

function getDecisionModalVariant(status: ReviewDecisionStatus) {
  if (status === "APPROVED") return "success";
  if (status === "REJECTED") return "danger";
  return "warning";
}

export default function ReviewerCourseWorkspacePage() {
  const params = useParams<{ reviewId: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const reviewId = params.reviewId;

  const [workspace, setWorkspace] =
    useState<ReviewerCourseReviewWorkspace | null>(null);

  const [status, setStatus] =
    useState<ReviewDecisionStatus>("CHANGES_REQUESTED");

  const [reviewNote, setReviewNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);

  const [alertModal, setAlertModal] = useState<AlertModalState>({
    open: false,
    title: "",
    message: "",
    variant: "info",
  });

  const [confirmDecisionModal, setConfirmDecisionModal] =
    useState<ConfirmDecisionModalState>({
      open: false,
    });

  const course = workspace?.course;
  const decisionLabel = getDecisionLabel(status);

  const requiresReviewNote =
    status === "CHANGES_REQUESTED" || status === "REJECTED";

  const isDecisionAlreadySubmitted =
    workspace?.reviewStatus &&
    workspace.reviewStatus !== "PENDING" &&
    workspace.reviewStatus !== "CHANGES_REQUESTED";

  const showModal = (
    title: string,
    message: string,
    variant: AlertModalState["variant"] = "info",
    redirectTo?: string
  ) => {
    setAlertModal({
      open: true,
      title,
      message,
      variant,
      redirectTo,
    });
  };

  const closeAlertModal = () => {
    const redirectTo = alertModal.redirectTo;

    setAlertModal({
      open: false,
      title: "",
      message: "",
      variant: "info",
    });

    if (redirectTo) {
      router.replace(redirectTo);
    }
  };

  const closeConfirmDecisionModal = () => {
    if (submittingDecision) return;

    setConfirmDecisionModal({
      open: false,
    });
  };

  async function fetchWorkspace() {
    if (!reviewId || reviewId === "undefined") {
      setWorkspace(null);
      showModal("Invalid review task", "Invalid review task id.", "error");
      return;
    }

    try {
      setLoading(true);

      const response = await reviewerCourseService.getReviewWorkspace(reviewId);
      const payload = unwrapData<ReviewerCourseReviewWorkspace>(response);

      setWorkspace(payload);
      setReviewNote(payload?.reviewNote ?? "");
    } catch (err) {
      setWorkspace(null);
      showModal(
        "Failed to load review workspace",
        getErrorMessage(err, "Failed to load review workspace."),
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmitDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!reviewId || reviewId === "undefined") {
      showModal("Invalid review task", "Invalid review task id.", "error");
      return;
    }

    if (requiresReviewNote && reviewNote.trim().length === 0) {
      showModal(
        "Review note is required",
        status === "REJECTED"
          ? "Please write a clear reason before rejecting this course. The instructor needs to understand why the course was rejected."
          : "Please write what the instructor should improve before requesting changes.",
        "warning"
      );
      return;
    }

    setConfirmDecisionModal({
      open: true,
    });
  }

  async function confirmSubmitDecision() {
    if (!reviewId || reviewId === "undefined") {
      showModal("Invalid review task", "Invalid review task id.", "error");
      return;
    }

    try {
      setSubmittingDecision(true);

      await reviewerCourseService.submitDecision(reviewId, {
        status,
        reviewNote: reviewNote.trim() || null,
      });

      setConfirmDecisionModal({
        open: false,
      });

      showModal(
        status === "APPROVED"
          ? "Course approved"
          : status === "REJECTED"
            ? "Course rejected"
            : "Changes requested",
        status === "APPROVED"
          ? "Course approved successfully."
          : status === "REJECTED"
            ? "Course rejected successfully. The instructor can view your review note."
            : "Change request submitted successfully. The instructor can view your review note and update the course.",
        "success",
        "/reviewer/courses"
      );
    } catch (err) {
      showModal(
        "Failed to submit decision",
        getErrorMessage(err, "Failed to submit review decision."),
        "error"
      );
    } finally {
      setSubmittingDecision(false);
    }
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
    if (alertModal.variant === "success") {
      return <CheckCircle2 className="h-6 w-6" />;
    }

    if (alertModal.variant === "error") {
      return <XCircle className="h-6 w-6" />;
    }

    if (alertModal.variant === "warning") {
      return <AlertTriangle className="h-6 w-6" />;
    }

    return <Info className="h-6 w-6" />;
  }

  function getDecisionModalIconStyle() {
    const variant = getDecisionModalVariant(status);

    if (variant === "success") {
      return "bg-green-100 text-green-700";
    }

    if (variant === "danger") {
      return "bg-red-100 text-red-700";
    }

    return "bg-yellow-100 text-yellow-700";
  }

  function getDecisionModalButtonStyle() {
    const variant = getDecisionModalVariant(status);

    if (variant === "success") {
      return "bg-green-600 hover:bg-green-700";
    }

    if (variant === "danger") {
      return "bg-red-600 hover:bg-red-700";
    }

    return "bg-yellow-600 hover:bg-yellow-700";
  }

  function getDecisionModalIcon() {
    if (status === "APPROVED") {
      return <CheckCircle2 className="h-6 w-6" />;
    }

    if (status === "REJECTED") {
      return <XCircle className="h-6 w-6" />;
    }

    return <AlertTriangle className="h-6 w-6" />;
  }

  useEffect(() => {
    if (authLoading) return;
    if (user?.role !== "REVIEWER") return;

    fetchWorkspace();
  }, [authLoading, user?.role, reviewId]);

  if (authLoading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-sm text-zinc-500">Loading...</p>
      </main>
    );
  }

  if (!user || user.role !== "REVIEWER") {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10">
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
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push("/reviewer/courses")}
            className="mb-3 inline-flex items-center text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to my review tasks
          </button>

          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Course Review Workspace
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Review full course information, curriculum, and submit your
            decision.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push(`/reviewer/courses/${reviewId}/preview`)}
            className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
          >
            Preview Course
          </button>

          <Link
            href="/reviewer/courses/available"
            className="inline-flex rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Available Courses
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading review workspace...</p>
      ) : !workspace || !course ? (
        <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            Review workspace not found
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            This review task may not exist, may not belong to your account, or
            the review id is invalid.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="space-y-6">
            <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              {course.thumbnailUrl ? (
                <img
                  src={course.thumbnailUrl}
                  alt={course.title || "Course thumbnail"}
                  className="h-64 w-full object-cover"
                />
              ) : (
                <div className="flex h-64 w-full items-center justify-center bg-zinc-100 text-sm text-zinc-400">
                  No thumbnail
                </div>
              )}

              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold text-zinc-900">
                    {course.title || "Untitled course"}
                  </h2>

                  <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                    {workspace.reviewStatus}
                  </span>

                  {course.status && (
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                      {course.status}
                    </span>
                  )}

                  {course.level && (
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                      {course.level}
                    </span>
                  )}

                  {course.isActive === false && (
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                      Inactive
                    </span>
                  )}
                </div>

                <p className="mt-3 text-sm text-zinc-500">
                  {course.shortDescription || "No short description."}
                </p>

                <div className="mt-5 grid gap-4 text-sm md:grid-cols-4">
                  <div>
                    <p className="font-medium text-zinc-900">Language</p>
                    <p className="text-zinc-500">
                      {course.language || "Not set"}
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-zinc-900">Price</p>
                    <p className="text-zinc-500">
                      {typeof course.price === "number"
                        ? formatCurrency(course.price)
                        : "Free / Not set"}
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-zinc-900">Certificate</p>
                    <p className="text-zinc-500">
                      {course.certificateEnabled ? "Enabled" : "Disabled"}
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-zinc-900">Review ID</p>
                    <p className="truncate text-zinc-500">
                      {workspace.reviewId}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 text-sm md:grid-cols-2">
                  <div>
                    <p className="font-medium text-zinc-900">Submitted At</p>
                    <p className="text-zinc-500">
                      {formatDateTime(workspace.submittedAt)}
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-zinc-900">Reviewed At</p>
                    <p className="text-zinc-500">
                      {workspace.reviewedAt
                        ? formatDateTime(workspace.reviewedAt)
                        : "Not reviewed yet"}
                    </p>
                  </div>
                </div>

                {(course.categories?.length ?? 0) > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 text-sm font-medium text-zinc-900">
                      Categories
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {course.categories?.map((category) => (
                        <span
                          key={category.id}
                          className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                        >
                          {category.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(course.instructors?.length ?? 0) > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 text-sm font-medium text-zinc-900">
                      Instructors
                    </p>
                    <p className="text-sm text-zinc-500">
                      {course.instructors
                        ?.map((instructor) => instructor.fullName)
                        .join(", ")}
                    </p>
                  </div>
                )}

                <div className="mt-6 border-t pt-5">
                  <p className="mb-2 text-sm font-medium text-zinc-900">
                    Description
                  </p>
                  <p className="whitespace-pre-line text-sm leading-6 text-zinc-600">
                    {course.description || "No description."}
                  </p>
                </div>

                {(course.whatYouWillLearn?.length ?? 0) > 0 && (
                  <div className="mt-6 border-t pt-5">
                    <p className="mb-2 text-sm font-medium text-zinc-900">
                      What students will learn
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-zinc-600">
                      {course.whatYouWillLearn?.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {(course.requirements?.length ?? 0) > 0 && (
                  <div className="mt-6 border-t pt-5">
                    <p className="mb-2 text-sm font-medium text-zinc-900">
                      Requirements
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-zinc-600">
                      {course.requirements?.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-zinc-900">
                Curriculum
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Review course sections, lessons, and lesson media.
              </p>

              <div className="mt-5 space-y-4">
                {(course.sections?.length ?? 0) === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center">
                    <p className="text-sm text-zinc-500">
                      No curriculum data found in this workspace response.
                    </p>
                  </div>
                ) : (
                  course.sections?.map((section, sectionIndex) => (
                    <div
                      key={section.id}
                      className="rounded-xl border bg-zinc-50 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-zinc-900">
                          Section {sectionIndex + 1}: {section.title}
                        </h3>

                        {section.isActive === false && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                            Inactive
                          </span>
                        )}
                      </div>

                      {section.description && (
                        <p className="mt-1 text-sm text-zinc-500">
                          {section.description}
                        </p>
                      )}

                      <div className="mt-4 space-y-3">
                        {(section.lessons?.length ?? 0) === 0 ? (
                          <p className="text-sm text-zinc-500">
                            No lessons in this section.
                          </p>
                        ) : (
                          section.lessons?.map((lesson, lessonIndex) => (
                            <div
                              key={lesson.id}
                              className="rounded-lg border bg-white p-4"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-zinc-900">
                                  Lesson {lessonIndex + 1}: {lesson.title}
                                </p>

                                {lesson.isActive === false && (
                                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                                    Inactive
                                  </span>
                                )}
                              </div>

                              {lesson.description && (
                                <p className="mt-1 text-sm text-zinc-500">
                                  {lesson.description}
                                </p>
                              )}

                              <div className="mt-3">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                                  Media
                                </p>

                                {(lesson.files?.length ?? 0) === 0 ? (
                                  <p className="text-sm text-zinc-500">
                                    No media files found.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {lesson.files?.map((file) => (
                                      <a
                                        key={file.id}
                                        href={file.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block rounded-md border bg-zinc-50 px-3 py-2 text-sm transition hover:bg-zinc-100"
                                      >
                                        <span className="font-medium text-zinc-900">
                                          {file.filename || "Open media"}
                                        </span>

                                        {file.type && (
                                          <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                                            {file.type}
                                          </span>
                                        )}

                                        {file.mimeType && (
                                          <span className="ml-2 text-xs text-zinc-500">
                                            {file.mimeType}
                                          </span>
                                        )}

                                        {formatFileSize(file.sizeInBytes) && (
                                          <span className="ml-2 text-xs text-zinc-500">
                                            {formatFileSize(file.sizeInBytes)}
                                          </span>
                                        )}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="sticky top-6 rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-zinc-900">
                Review Decision
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Submit your final decision for this course.
              </p>

              {isDecisionAlreadySubmitted && (
                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                  This review task already has status{" "}
                  <span className="font-semibold">
                    {workspace.reviewStatus}
                  </span>
                  . Submitting another decision may be blocked by the backend.
                </div>
              )}

              <form onSubmit={handleSubmitDecision} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-900">
                    Decision
                  </label>

                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as ReviewDecisionStatus)
                    }
                    className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  >
                    <option value="APPROVED">Approve</option>
                    <option value="CHANGES_REQUESTED">Request changes</option>
                    <option value="REJECTED">Reject</option>
                  </select>

                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    {getDecisionDescription(status)}
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-900">
                    Review Note{" "}
                    {requiresReviewNote && (
                      <span className="text-red-600">*</span>
                    )}
                  </label>

                  <textarea
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    placeholder={
                      status === "APPROVED"
                        ? "Optional note for the instructor..."
                        : status === "REJECTED"
                          ? "Write a clear reason why this course is rejected..."
                          : "Write what the instructor should improve..."
                    }
                    rows={8}
                    maxLength={10000}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  />

                  <div className="mt-1 flex justify-between text-xs text-zinc-500">
                    <span>
                      {requiresReviewNote
                        ? "Required for this decision."
                        : "Optional for approval."}
                    </span>
                    <span>{reviewNote.length}/10000</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingDecision}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {submittingDecision ? "Submitting..." : decisionLabel}
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}

      {confirmDecisionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl border bg-white p-6 shadow-2xl">
            <div
              className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${getDecisionModalIconStyle()}`}
            >
              {getDecisionModalIcon()}
            </div>

            <h2 className="text-lg font-semibold text-zinc-900">
              Confirm decision
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Are you sure you want to submit this decision?
            </p>

            <div className="mt-4 rounded-xl border bg-zinc-50 p-4">
              <p className="text-sm text-zinc-500">Decision</p>
              <p className="mt-1 font-semibold text-zinc-900">{status}</p>

              <p className="mt-4 text-sm text-zinc-500">Review note</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                {reviewNote.trim() || "No note provided."}
              </p>
            </div>

            {status === "REJECTED" && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
                Rejected courses may become archived. The instructor may not be
                able to edit this course again, so make sure your note is clear.
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeConfirmDecisionModal}
                disabled={submittingDecision}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmSubmitDecision}
                disabled={submittingDecision}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${getDecisionModalButtonStyle()}`}
              >
                {submittingDecision ? "Submitting..." : "Submit Decision"}
              </button>
            </div>
          </div>
        </div>
      )}

      {alertModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl">
            <div
              className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${getAlertIconStyle()}`}
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
  );
}