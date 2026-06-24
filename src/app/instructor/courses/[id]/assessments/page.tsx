"use client";

import React, { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { assessmentService } from "@/services/assessment.service";
import type {
  Assessment,
  PaginatedAssessmentResponse,
} from "@/types/assessment";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
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

function statusClassName(status?: string) {
  if (status === "PUBLISHED") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (status === "ARCHIVED") {
    return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
  }

  return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
}

export default function InstructorCourseAssessmentsPage({ params }: PageProps) {
  const { id: courseId } = use(params);

  const [data, setData] =
    useState<PaginatedAssessmentResponse<Assessment> | null>(null);

  const [status, setStatus] = useState("");
  const [type, setType] = useState("");

  const [assessmentToDelete, setAssessmentToDelete] =
    useState<Assessment | null>(null);

  const [assessmentToPublish, setAssessmentToPublish] =
    useState<Assessment | null>(null);

  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assessments = useMemo(() => data?.data || [], [data]);

  async function loadAssessments(options?: {
    silent?: boolean;
    nextType?: string;
    nextStatus?: string;
  }) {
    try {
      if (options?.silent) {
        setFiltering(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const requestParams: Record<string, string | number> = {
        page: 1,
        limit: 20,
      };

      const selectedType = options?.nextType ?? type;
      const selectedStatus = options?.nextStatus ?? status;

      if (selectedType) requestParams.type = selectedType;
      if (selectedStatus) requestParams.status = selectedStatus;

      const result = await assessmentService.getInstructorAssessments(
        courseId,
        requestParams
      );

      setData(result);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load assessments."));
    } finally {
      setLoading(false);
      setFiltering(false);
    }
  }

  useEffect(() => {
    loadAssessments();
  }, [courseId]);

  async function handleTypeChange(value: string) {
    setType(value);
    await loadAssessments({ silent: true, nextType: value });
  }

  async function handleStatusChange(value: string) {
    setStatus(value);
    await loadAssessments({ silent: true, nextStatus: value });
  }

  async function confirmDeleteAssessment() {
    if (!assessmentToDelete) return;

    try {
      setDeleting(true);
      setError(null);

      await assessmentService.deleteAssessment(courseId, assessmentToDelete.id);

      setAssessmentToDelete(null);
      await loadAssessments({ silent: true });
    } catch (err) {
      setError(getErrorMessage(err, "Could not delete assessment."));
    } finally {
      setDeleting(false);
    }
  }

  async function confirmPublishAssessment() {
    if (!assessmentToPublish) return;

    try {
      setPublishing(true);
      setError(null);

      await assessmentService.publishAssessment(courseId, assessmentToPublish.id);

      setAssessmentToPublish(null);
      await loadAssessments({ silent: true });
    } catch (err) {
      setError(getErrorMessage(err, "Could not publish assessment."));
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-zinc-500">Instructor / Course</p>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Course assessments
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage quizzes and projects for this course.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/instructor/courses/${courseId}/curriculum`}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Curriculum
          </Link>

          <Link
            href={`/instructor/courses/${courseId}/assessments/new`}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
          >
            New assessment
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Filters</p>
          <p className="text-xs text-zinc-500">
            Use these only when this course has many assessments.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={type}
            onChange={(event) => handleTypeChange(event.target.value)}
            disabled={filtering}
            className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">All types</option>
            <option value="QUIZ">Quiz</option>
            <option value="PROJECT">Project</option>
          </select>

          <select
            value={status}
            onChange={(event) => handleStatusChange(event.target.value)}
            disabled={filtering}
            className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {filtering && (
        <p className="text-sm text-zinc-500">Updating assessments...</p>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-sm text-zinc-500">Loading assessments...</p>
      )}

      {!loading && assessments.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
          No assessments found for this course.
        </div>
      )}

      <div className="grid gap-4">
        {assessments.map((assessment) => {
          const isPublished = assessment.status === "PUBLISHED";
          const isQuiz = assessment.type === "QUIZ";

          return (
            <div
              key={assessment.id}
              className="rounded-xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">
                      {assessment.title}
                    </h2>

                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium dark:bg-zinc-800">
                      {assessment.type}
                    </span>

                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${statusClassName(
                        assessment.status
                      )}`}
                    >
                      {assessment.status || "DRAFT"}
                    </span>

                    {!assessment.isActive && (
                      <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                        Inactive
                      </span>
                    )}
                  </div>

                  <p className="line-clamp-2 text-sm text-zinc-500">
                    {assessment.description || "No description"}
                  </p>

                  <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                    <span>Total points: {assessment.totalPoints ?? 0}</span>
                    <span>
                      Passing:{" "}
                      {assessment.passingScore !== null &&
                      assessment.passingScore !== undefined
                        ? `${assessment.passingScore}%`
                        : "None"}
                    </span>
                    <span>
                      Max attempts: {assessment.maxAttempts ?? "Unlimited"}
                    </span>
                    <span>
                      Time limit:{" "}
                      {assessment.timeLimitMinutes
                        ? `${assessment.timeLimitMinutes} min`
                        : "None"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/instructor/courses/${courseId}/assessments/${assessment.id}/edit`}
                    className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    Edit
                  </Link>

                  {isQuiz && (
                    <Link
                      href={`/instructor/courses/${courseId}/assessments/${assessment.id}/questions`}
                      className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                    >
                      Questions
                    </Link>
                  )}

                  {!isPublished && (
                    <button
                      type="button"
                      onClick={() => setAssessmentToPublish(assessment)}
                      className="rounded-lg border border-emerald-200 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                    >
                      Publish
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setAssessmentToDelete(assessment)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {assessmentToPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl border bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-lg font-semibold">Publish assessment?</h2>

            <p className="mt-2 text-sm text-zinc-500">
              Once published, learners may be able to access this assessment
              based on its availability settings. Some content fields may become
              restricted from editing.
            </p>

            <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
              <p className="font-medium">{assessmentToPublish.title}</p>
              <p className="mt-1 text-xs text-zinc-500">
                Type: {assessmentToPublish.type} · Points:{" "}
                {assessmentToPublish.totalPoints ?? 0}
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssessmentToPublish(null)}
                disabled={publishing}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmPublishAssessment}
                disabled={publishing}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {publishing ? "Publishing..." : "Publish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {assessmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl border bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-lg font-semibold">Delete assessment?</h2>

            <p className="mt-2 text-sm text-zinc-500">
              This assessment will be deleted from the course. This action
              cannot be undone.
            </p>

            <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
              <p className="font-medium">{assessmentToDelete.title}</p>
              <p className="mt-1 text-xs text-zinc-500">
                Status: {assessmentToDelete.status || "DRAFT"} · Type:{" "}
                {assessmentToDelete.type}
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssessmentToDelete(null)}
                disabled={deleting}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteAssessment}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}