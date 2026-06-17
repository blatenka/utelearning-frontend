"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Send, X } from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";
import {
  reviewerCourseService,
  unwrapData,
} from "@/services/review.service";

import type {
  ReviewDecisionStatus,
  ReviewerCourseReviewWorkspace,
} from "@/services/review.service";

export default function ReviewerCourseWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const reviewId = String(params.reviewId);

  const [workspace, setWorkspace] =
    useState<ReviewerCourseReviewWorkspace | null>(null);

  const [status, setStatus] =
    useState<ReviewDecisionStatus>("CHANGES_REQUESTED");

  const [reviewNote, setReviewNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);

  const course = workspace?.course;

  const decisionLabel =
    status === "APPROVED"
      ? "Approve Course"
      : status === "REJECTED"
      ? "Reject Course"
      : "Request Changes";

  const decisionDescription =
    status === "APPROVED"
      ? "This course will be approved. Depending on backend logic, it may become published or move to the next approved state."
      : status === "REJECTED"
      ? "This course will be rejected. The instructor may need to create or submit another version later."
      : "This course will be sent back to the instructor with your requested changes.";

  async function fetchWorkspace() {
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      const response = await reviewerCourseService.getReviewWorkspace(reviewId);
      const payload = unwrapData<ReviewerCourseReviewWorkspace>(response);

      setWorkspace(payload);
      setReviewNote(payload.reviewNote ?? "");
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to load review workspace."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleOpenConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setConfirmOpen(true);
  }

  async function handleConfirmSubmitDecision() {
    try {
      setSubmittingDecision(true);
      setError("");
      setSuccessMessage("");

      const response = await reviewerCourseService.submitDecision(reviewId, {
        status,
        reviewNote: reviewNote.trim() || null,
      });

      const result = unwrapData<any>(response);

      setConfirmOpen(false);

      setSuccessMessage(
        status === "APPROVED"
          ? "Course approved successfully."
          : status === "REJECTED"
          ? "Course rejected successfully."
          : "Change request submitted successfully."
      );

      setWorkspace((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          reviewStatus: result?.reviewStatus ?? status,
          reviewNote: result?.reviewNote ?? reviewNote,
          reviewedAt: result?.reviewedAt ?? new Date().toISOString(),
          course: {
            ...prev.course,
            status: result?.course?.status ?? prev.course.status,
            publishedAt: result?.course?.publishedAt ?? prev.course.publishedAt,
            updatedAt: result?.course?.updatedAt ?? prev.course.updatedAt,
          },
        };
      });
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to submit review decision."
      );
    } finally {
      setSubmittingDecision(false);
    }
  }

  useEffect(() => {
    if (!authLoading && user?.role === "REVIEWER") {
      fetchWorkspace();
    }
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

        <Link
          href="/reviewer/courses/available"
          className="inline-flex rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          Available Courses
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {Array.isArray(error) ? error.join(", ") : error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
          <div className="flex items-center">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            <span>{successMessage}</span>
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => router.push("/reviewer/courses")}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              Back to My Review Tasks
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading review workspace...</p>
      ) : !workspace || !course ? (
        <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            Review workspace not found
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            This review task may not exist or may not belong to your account.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="space-y-6">
            <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              {course.thumbnailUrl ? (
                <img
                  src={course.thumbnailUrl}
                  alt={course.title}
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
                    {course.title}
                  </h2>

                  <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                    {workspace.reviewStatus}
                  </span>

                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                    {course.status}
                  </span>

                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                    {course.level}
                  </span>

                  {!course.isActive && (
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                      Inactive
                    </span>
                  )}
                </div>

                <p className="mt-3 text-sm text-zinc-500">
                  {course.shortDescription}
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
                        ? `$${course.price}`
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
                      {new Date(workspace.submittedAt).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-zinc-900">Reviewed At</p>
                    <p className="text-zinc-500">
                      {workspace.reviewedAt
                        ? new Date(workspace.reviewedAt).toLocaleString()
                        : "Not reviewed yet"}
                    </p>
                  </div>
                </div>

                {course.categories.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 text-sm font-medium text-zinc-900">
                      Categories
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {course.categories.map((category) => (
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

                {course.instructors.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 text-sm font-medium text-zinc-900">
                      Instructors
                    </p>
                    <p className="text-sm text-zinc-500">
                      {course.instructors
                        .map((instructor) => instructor.fullName)
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

                {course.whatYouWillLearn?.length ? (
                  <div className="mt-6 border-t pt-5">
                    <p className="mb-2 text-sm font-medium text-zinc-900">
                      What students will learn
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-zinc-600">
                      {course.whatYouWillLearn.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {course.requirements?.length ? (
                  <div className="mt-6 border-t pt-5">
                    <p className="mb-2 text-sm font-medium text-zinc-900">
                      Requirements
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-zinc-600">
                      {course.requirements.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
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
                {course.sections.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center">
                    <p className="text-sm text-zinc-500">
                      No curriculum data found in this workspace response.
                    </p>
                  </div>
                ) : (
                  course.sections.map((section, sectionIndex) => (
                    <div
                      key={section.id}
                      className="rounded-xl border bg-zinc-50 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-zinc-900">
                          Section {sectionIndex + 1}: {section.title}
                        </h3>

                        {!section.isActive && (
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
                        {section.lessons.length === 0 ? (
                          <p className="text-sm text-zinc-500">
                            No lessons in this section.
                          </p>
                        ) : (
                          section.lessons.map((lesson, lessonIndex) => (
                            <div
                              key={lesson.id}
                              className="rounded-lg border bg-white p-4"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-zinc-900">
                                  Lesson {lessonIndex + 1}: {lesson.title}
                                </p>

                                {!lesson.isActive && (
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

                                {lesson.files.length === 0 ? (
                                  <p className="text-sm text-zinc-500">
                                    No media files found.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {lesson.files.map((file) => (
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

                                        <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                                          {file.type}
                                        </span>

                                        {file.mimeType && (
                                          <span className="ml-2 text-xs text-zinc-500">
                                            {file.mimeType}
                                          </span>
                                        )}

                                        {typeof file.sizeInBytes ===
                                          "number" && (
                                          <span className="ml-2 text-xs text-zinc-500">
                                            {Math.round(
                                              file.sizeInBytes / 1024
                                            )}{" "}
                                            KB
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

              <form onSubmit={handleOpenConfirm} className="mt-5 space-y-4">
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
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-900">
                    Review Note
                  </label>

                  <textarea
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    placeholder="Write review notes for the instructor..."
                    rows={8}
                    maxLength={10000}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingDecision || Boolean(successMessage)}
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

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  Confirm Review Decision
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {decisionDescription}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 rounded-xl border bg-zinc-50 p-4">
              <p className="text-sm text-zinc-500">Selected decision</p>
              <p className="mt-1 text-base font-semibold text-zinc-900">
                {status}
              </p>

              {reviewNote.trim() && (
                <div className="mt-4">
                  <p className="text-sm text-zinc-500">Review note</p>
                  <p className="mt-1 max-h-32 overflow-y-auto whitespace-pre-line text-sm text-zinc-700">
                    {reviewNote}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={submittingDecision}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmSubmitDecision}
                disabled={submittingDecision}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  status === "APPROVED"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : status === "REJECTED"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {submittingDecision ? "Submitting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}