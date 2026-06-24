"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { assessmentService } from "@/services/assessment.service";
import type { LearnerAssessment } from "@/types/assessment";

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

  return fallback;
}

function formatDateTime(value?: string | null) {
  if (!value) return "No limit";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No limit";
  }

  return date.toLocaleString();
}

function stateClassName(state: string) {
  if (state === "CAN_START" || state === "CAN_CONTINUE") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (state === "COMPLETED") {
    return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
  }

  if (state === "MAX_ATTEMPTS_REACHED" || state === "LOCKED") {
    return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300";
  }

  if (state === "NOT_AVAILABLE") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  }

  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

function getPrimaryButtonText(action: LearnerAssessment["primaryAction"]) {
  if (action === "START") return "Start assessment";
  if (action === "CONTINUE") return "Continue attempt";
  if (action === "VIEW_RESULT") return "View result";
  return "Unavailable";
}

export default function LearnerAssessmentDetailPage({ params }: PageProps) {
  const { courseId, assessmentId } = use(params);
  const router = useRouter();

  const [assessment, setAssessment] = useState<LearnerAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAssessment() {
    try {
      setLoading(true);
      setError(null);

      const data = await assessmentService.getLearnerAssessmentDetail(
        assessmentId
      );

      setAssessment(data);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load assessment."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssessment();
  }, [assessmentId]);

  async function handlePrimaryAction() {
    if (!assessment) return;

    if (
      assessment.primaryAction === "CONTINUE" &&
      assessment.latestAttempt?.attemptId
    ) {
      router.push(
        `/learning/courses/${courseId}/assessments/${assessmentId}/attempt?attemptId=${assessment.latestAttempt.attemptId}`
      );
      return;
    }

    if (
      assessment.primaryAction === "VIEW_RESULT" &&
      assessment.latestAttempt?.attemptId
    ) {
      router.push(
        `/learning/courses/${courseId}/assessments/${assessmentId}/result/${assessment.latestAttempt.attemptId}`
      );
      return;
    }

    if (assessment.primaryAction === "START") {
      setShowStartModal(true);
    }
  }

  async function confirmStartAttempt() {
    if (!assessment) return;

    try {
      setStarting(true);
      setError(null);

      const attempt = await assessmentService.startAttempt(assessmentId);

      setShowStartModal(false);

      router.push(
        `/learning/courses/${courseId}/assessments/${assessmentId}/attempt?attemptId=${attempt.attemptId}`
      );
    } catch (err) {
      setError(getErrorMessage(err, "Could not start assessment."));
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading assessment...</p>;
  }

  if (error && !assessment) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
        {error}
      </div>
    );
  }

  if (!assessment) {
    return null;
  }

  const canUsePrimaryAction = assessment.primaryAction !== "NONE" && !starting;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm text-zinc-500">Learning / Assessment</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{assessment.title}</h1>
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${stateClassName(
              assessment.state
            )}`}
          >
            {assessment.state}
          </span>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-500">
          {assessment.description || "No description"}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 rounded-xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-2">
        <Info label="Type" value={assessment.type} />
        <Info label="Total points" value={assessment.totalPoints} />
        <Info
          label="Passing score"
          value={
            assessment.passingScore !== null &&
            assessment.passingScore !== undefined
              ? `${assessment.passingScore}%`
              : "None"
          }
        />
        <Info
          label="Time limit"
          value={
            assessment.timeLimitMinutes
              ? `${assessment.timeLimitMinutes} minutes`
              : "None"
          }
        />
        <Info
          label="Max attempts"
          value={assessment.maxAttempts ?? "Unlimited"}
        />
        <Info label="Attempts used" value={assessment.attemptsUsed} />
        <Info
          label="Attempts remaining"
          value={assessment.attemptsRemaining ?? "Unlimited"}
        />
        <Info label="Current action" value={assessment.primaryAction} />
        <Info
          label="Available from"
          value={formatDateTime(assessment.availableFrom)}
        />
        <Info
          label="Available until"
          value={formatDateTime(assessment.availableUntil)}
        />
      </div>

      {assessment.latestAttempt && (
        <div className="rounded-xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold">Latest attempt</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Info
              label="Attempt"
              value={`#${assessment.latestAttempt.attemptNumber}`}
            />
            <Info label="Status" value={assessment.latestAttempt.status} />
            <Info
              label="Score"
              value={`${assessment.latestAttempt.score ?? "-"} / ${
                assessment.latestAttempt.maxScore ?? "-"
              }`}
            />
            <Info
              label="Result"
              value={assessment.latestAttempt.passed ? "Passed" : "Not passed"}
            />
            <Info
              label="Started at"
              value={formatDateTime(assessment.latestAttempt.startedAt)}
            />
            <Info
              label="Submitted at"
              value={formatDateTime(assessment.latestAttempt.submittedAt)}
            />
          </div>
        </div>
      )}

      {assessment.message && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          {assessment.message}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/learning/courses/${courseId}/assessments`}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Back to assessments
        </Link>

        <Link
          href={`/learning/courses/${courseId}/assessments/${assessmentId}/history`}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Attempt history
        </Link>

        <button
          type="button"
          disabled={!canUsePrimaryAction}
          onClick={handlePrimaryAction}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900"
        >
          {starting
            ? "Starting..."
            : getPrimaryButtonText(assessment.primaryAction)}
        </button>
      </div>

      {showStartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl border bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-lg font-semibold">Start assessment?</h2>

            <p className="mt-2 text-sm text-zinc-500">
              A new attempt will be created for this assessment. Make sure you
              have enough time before starting.
            </p>

            <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
              <p className="font-medium">{assessment.title}</p>
              <p className="mt-1 text-xs text-zinc-500">
                Type: {assessment.type} · Time limit:{" "}
                {assessment.timeLimitMinutes
                  ? `${assessment.timeLimitMinutes} minutes`
                  : "No limit"}
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowStartModal(false)}
                disabled={starting}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmStartAttempt}
                disabled={starting}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
              >
                {starting ? "Starting..." : "Start"}
              </button>
            </div>
          </div>
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
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}