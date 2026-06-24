"use client";

import React, { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { assessmentService } from "@/services/assessment.service";
import type { AttemptHistory, AttemptHistoryItem } from "@/types/assessment";

type PageProps = {
  params: Promise<{
    courseId: string;
    assessmentId: string;
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

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

function formatScore(attempt: AttemptHistoryItem) {
  const score = attempt.score ?? "-";
  const maxScore = attempt.maxScore ?? "-";

  return `${score} / ${maxScore}`;
}

function statusClassName(status: string) {
  if (status === "IN_PROGRESS") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  }

  if (status === "SUBMITTED") {
    return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
  }

  if (status === "GRADED") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (status === "EXPIRED") {
    return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300";
  }

  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

export default function AttemptHistoryPage({ params }: PageProps) {
  const { courseId, assessmentId } = use(params);

  const [history, setHistory] = useState<AttemptHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const attempts = useMemo(() => history?.attempts || [], [history]);

  async function loadHistory() {
    try {
      setLoading(true);
      setError(null);

      const data = await assessmentService.getAttemptHistory(assessmentId);

      setHistory(data);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load attempt history."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, [assessmentId]);

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading attempt history...</p>;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadHistory}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Retry
          </button>

          <Link
            href={`/learning/courses/${courseId}/assessments/${assessmentId}`}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Back to assessment
          </Link>
        </div>
      </div>
    );
  }

  if (!history) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-zinc-500">Learning / Assessment</p>
          <h1 className="text-2xl font-bold">Attempt history</h1>

          <p className="mt-1 text-sm text-zinc-500">
            {history.assessmentTitle}
          </p>

          <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-500">
            <span>Type: {history.assessmentType}</span>
            <span>
              Attempts used: {history.attemptsUsed} /{" "}
              {history.maxAttempts ?? "Unlimited"}
            </span>

            {history.attemptsRemaining !== null &&
              history.attemptsRemaining !== undefined && (
                <span>Attempts remaining: {history.attemptsRemaining}</span>
              )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/learning/courses/${courseId}`}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Back to course
          </Link>

          <Link
            href={`/learning/courses/${courseId}/assessments/${assessmentId}`}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Back to assessment
          </Link>
        </div>
      </div>

      {attempts.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
          You have not started any attempts yet.
        </div>
      )}

      {attempts.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3">Attempt</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Passed</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {attempts.map((attempt) => (
                  <tr
                    key={attempt.attemptId}
                    className="border-b last:border-0 dark:border-zinc-800"
                  >
                    <td className="px-4 py-3 font-medium">
                      #{attempt.attemptNumber}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${statusClassName(
                          attempt.status
                        )}`}
                      >
                        {attempt.status}
                      </span>
                    </td>

                    <td className="px-4 py-3">{formatScore(attempt)}</td>

                    <td className="px-4 py-3">
                      {attempt.passed ? (
                        <span className="font-medium text-emerald-600 dark:text-emerald-300">
                          Yes
                        </span>
                      ) : (
                        <span className="text-zinc-500">No</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {formatDateTime(attempt.startedAt)}
                    </td>

                    <td className="px-4 py-3">
                      {formatDateTime(attempt.submittedAt)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {attempt.canContinue && (
                          <Link
                            href={`/learning/courses/${courseId}/assessments/${assessmentId}/attempt?attemptId=${attempt.attemptId}`}
                            className="rounded-lg border px-3 py-2 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                          >
                            Continue
                          </Link>
                        )}

                        {attempt.canViewResult && (
                          <Link
                            href={`/learning/courses/${courseId}/assessments/${assessmentId}/result/${attempt.attemptId}`}
                            className="rounded-lg border px-3 py-2 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                          >
                            View result
                          </Link>
                        )}

                        {!attempt.canContinue && !attempt.canViewResult && (
                          <span className="text-xs text-zinc-400">
                            No action
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}