"use client";

import React, { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { assessmentService } from "@/services/assessment.service";
import type { AttemptResult } from "@/types/assessment";

type PageProps = {
  params: Promise<{
    courseId: string;
    assessmentId: string;
    attemptId: string;
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

function formatScore(score?: number | null, maxScore?: number | null) {
  return `${score ?? "-"} / ${maxScore ?? "-"}`;
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

function resultClassName(passed: boolean) {
  return passed
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
    : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300";
}

function answerResultClassName(isCorrect?: boolean | null) {
  if (isCorrect === true) {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (isCorrect === false) {
    return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300";
  }

  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

export default function AttemptResultPage({ params }: PageProps) {
  const { courseId, assessmentId, attemptId } = use(params);

  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingRetake, setStartingRetake] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answers = useMemo(() => result?.answers || [], [result]);

  async function loadResult() {
    try {
      setLoading(true);
      setError(null);

      const data = await assessmentService.getAttemptResult(attemptId);

      setResult(data);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load result."));
    } finally {
      setLoading(false);
    }
  }

  async function handleRetake() {
    try {
      setStartingRetake(true);
      setError(null);

      const attempt = await assessmentService.startAttempt(assessmentId);

      window.location.href = `/learning/courses/${courseId}/assessments/${assessmentId}/attempt?attemptId=${attempt.attemptId}`;
    } catch (err) {
      setError(getErrorMessage(err, "Could not start a new attempt."));
    } finally {
      setStartingRetake(false);
    }
  }

  useEffect(() => {
    loadResult();
  }, [attemptId]);

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading result...</p>;
  }

  if (error && !result) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadResult}
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

  if (!result) {
    return null;
  }

  const isProject = result.assessmentType === "PROJECT";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-zinc-500">Learning / Assessment</p>
          <h1 className="text-2xl font-bold">Assessment result</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {result.assessmentTitle}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/learning/courses/${courseId}/assessments/${assessmentId}`}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Back to assessment
          </Link>

          <Link
            href={`/learning/courses/${courseId}/assessments/${assessmentId}/history`}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            History
          </Link>

          {result.canRetake && (
            <button
              type="button"
              onClick={handleRetake}
              disabled={startingRetake}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
            >
              {startingRetake ? "Starting..." : "Retake"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 rounded-xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Attempt" value={`#${result.attemptNumber}`} />

        <Info
          label="Status"
          value={
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${statusClassName(
                result.status
              )}`}
            >
              {result.status}
            </span>
          }
        />

        <Info
          label="Score"
          value={formatScore(result.score, result.maxScore)}
        />

        <Info
          label="Result"
          value={
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${resultClassName(
                result.passed
              )}`}
            >
              {result.passed ? "Passed" : "Not passed"}
            </span>
          }
        />
      </div>

      <div className="grid gap-4 rounded-xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-2 lg:grid-cols-3">
        <Info label="Type" value={result.assessmentType} />
        <Info label="Started at" value={formatDateTime(result.startedAt)} />
        <Info label="Submitted at" value={formatDateTime(result.submittedAt)} />
      </div>

      {result.projectSubmission && (
        <div className="rounded-xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Project submission</h2>
              <p className="text-sm text-zinc-500">
                Submitted at{" "}
                {formatDateTime(result.projectSubmission.submittedAt)}
              </p>
            </div>

            <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium dark:bg-zinc-800">
              {result.projectSubmission.status}
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <ExternalLinkRow
              label="GitHub"
              value={result.projectSubmission.githubUrl}
            />

            <ExternalLinkRow
              label="Deploy"
              value={result.projectSubmission.deployUrl}
            />

            <ExternalLinkRow
              label="Document"
              value={result.projectSubmission.documentUrl}
            />

            {result.projectSubmission.note && (
              <InfoBlock label="Note" value={result.projectSubmission.note} />
            )}

            {result.projectSubmission.feedback && (
              <InfoBlock
                label="Feedback"
                value={result.projectSubmission.feedback}
              />
            )}

            {result.projectSubmission.score !== null &&
              result.projectSubmission.score !== undefined && (
                <div>
                  <p className="font-medium">Project score</p>
                  <p className="mt-1 text-zinc-600 dark:text-zinc-300">
                    {result.projectSubmission.score}
                  </p>
                </div>
              )}

            {result.projectSubmission.gradedAt && (
              <div>
                <p className="font-medium">Graded at</p>
                <p className="mt-1 text-zinc-600 dark:text-zinc-300">
                  {formatDateTime(result.projectSubmission.gradedAt)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {!isProject && result.canReview && answers.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Review answers</h2>

          {answers.map((answer, index) => (
            <div
              key={answer.questionId}
              className="rounded-xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="mb-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                  Question #{index + 1}
                </span>

                <span className="rounded-full bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                  {answer.questionType}
                </span>

                <span className="rounded-full bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                  {answer.pointsEarned ?? 0}/{answer.points} pts
                </span>

                {answer.isCorrect !== null && answer.isCorrect !== undefined && (
                  <span
                    className={`rounded-full px-2 py-1 ${answerResultClassName(
                      answer.isCorrect
                    )}`}
                  >
                    {answer.isCorrect ? "Correct" : "Incorrect"}
                  </span>
                )}
              </div>

              <h3 className="font-semibold">{answer.questionText}</h3>

              <div className="mt-3 space-y-2 text-sm">
                <p className="text-zinc-500">
                  Your answer:{" "}
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {answer.learnerAnswer || "-"}
                  </span>
                </p>

                {answer.correctAnswer && (
                  <p className="text-zinc-500">
                    Correct answer:{" "}
                    <span className="text-zinc-900 dark:text-zinc-100">
                      {answer.correctAnswer}
                    </span>
                  </p>
                )}

                {answer.explanation && (
                  <InfoBlock label="Explanation" value={answer.explanation} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isProject && result.canReview && answers.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
          No review details are available for this result.
        </div>
      )}

      {!isProject && !result.canReview && (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
          Review details are not available for this assessment.
        </div>
      )}
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-medium">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-zinc-600 dark:text-zinc-300">
        {value}
      </p>
    </div>
  );
}

function ExternalLinkRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) {
    return null;
  }

  return (
    <p>
      <span className="font-medium">{label}: </span>
      <a
        className="break-all underline underline-offset-2"
        href={value}
        target="_blank"
        rel="noopener noreferrer"
      >
        {value}
      </a>
    </p>
  );
}