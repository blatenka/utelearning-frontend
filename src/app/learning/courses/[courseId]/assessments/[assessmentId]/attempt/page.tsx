"use client";

import React, { Suspense, use, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { assessmentService } from "@/services/assessment.service";
import type { ActiveAttempt } from "@/types/assessment";

type PageProps = {
  params: Promise<{
    courseId: string;
    assessmentId: string;
  }>;
};

type ProjectFormState = {
  githubUrl: string;
  deployUrl: string;
  documentUrl: string;
  note: string;
};

const emptyProjectForm: ProjectFormState = {
  githubUrl: "",
  deployUrl: "",
  documentUrl: "",
  note: "",
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

function isValidUrl(value: string) {
  if (!value.trim()) return true;

  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function formatTime(seconds: number | null) {
  if (seconds === null) return "No limit";

  const safeSeconds = Math.max(seconds, 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const remain = Math.floor(safeSeconds % 60).toString().padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${minutes}:${remain}`;
  }

  return `${minutes}:${remain}`;
}

export default function AssessmentAttemptPage({ params }: PageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading attempt...</p>}>
      <AssessmentAttemptContent params={params} />
    </Suspense>
  );
}

function AssessmentAttemptContent({ params }: PageProps) {
  const { courseId, assessmentId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryAttemptId = searchParams.get("attemptId");

  const [attempt, setAttempt] = useState<ActiveAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [projectForm, setProjectForm] =
    useState<ProjectFormState>(emptyProjectForm);

  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sortedQuestions = useMemo(() => {
    return [...(attempt?.questions || [])].sort((a, b) => a.order - b.order);
  }, [attempt]);

  const answeredCount = useMemo(() => {
    return sortedQuestions.filter((question) =>
      answers[question.questionId]?.trim()
    ).length;
  }, [sortedQuestions, answers]);

  async function loadAttempt() {
    try {
      setLoading(true);
      setError(null);

      const attemptId =
        queryAttemptId ||
        (await assessmentService.startAttempt(assessmentId)).attemptId;

      const data = await assessmentService.getActiveAttempt(attemptId);

      setAttempt(data);
      setRemainingSeconds(data.remainingSeconds ?? null);

      const restored: Record<string, string> = {};
      data.savedAnswers.forEach((item) => {
        restored[item.questionId] = item.answer || "";
      });

      setAnswers(restored);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load attempt."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAttempt();
  }, [assessmentId, queryAttemptId]);

  useEffect(() => {
    if (remainingSeconds === null) return;

    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null) return null;
        return Math.max(prev - 1, 0);
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [attempt?.attemptId, remainingSeconds === null]);

  async function saveAnswer(questionId: string, answer: string) {
    if (!attempt) return;

    setAnswers((prev) => ({ ...prev, [questionId]: answer }));

    if (!answer.trim()) {
      return;
    }

    try {
      setSavingQuestionId(questionId);
      setError(null);

      const result = await assessmentService.saveAttemptAnswer(
        attempt.attemptId,
        questionId,
        { answer: answer.trim() }
      );

      if (result.remainingSeconds !== undefined) {
        setRemainingSeconds(result.remainingSeconds);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Could not save answer."));
    } finally {
      setSavingQuestionId(null);
    }
  }

  function validateProjectSubmission() {
    const githubUrl = projectForm.githubUrl.trim();
    const deployUrl = projectForm.deployUrl.trim();
    const documentUrl = projectForm.documentUrl.trim();
    const note = projectForm.note.trim();

    if (!githubUrl && !deployUrl && !documentUrl && !note) {
      return "Please provide at least one submission link or note.";
    }

    if (!isValidUrl(githubUrl)) {
      return "GitHub URL must be a valid URL.";
    }

    if (!isValidUrl(deployUrl)) {
      return "Deploy URL must be a valid URL.";
    }

    if (!isValidUrl(documentUrl)) {
      return "Document URL must be a valid URL.";
    }

    return null;
  }

  function openSubmitModal() {
    if (!attempt) return;

    if (attempt.type === "PROJECT") {
      const validationError = validateProjectSubmission();
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setShowSubmitModal(true);
  }

  async function confirmSubmit() {
    if (!attempt) return;

    try {
      setSubmitting(true);
      setError(null);

      if (attempt.type === "PROJECT") {
        await assessmentService.submitProject(attempt.attemptId, {
          githubUrl: projectForm.githubUrl.trim() || undefined,
          deployUrl: projectForm.deployUrl.trim() || undefined,
          documentUrl: projectForm.documentUrl.trim() || undefined,
          note: projectForm.note.trim() || undefined,
        });
      }

      const result = await assessmentService.submitAttempt(attempt.attemptId);

      setShowSubmitModal(false);

      router.push(
        `/learning/courses/${courseId}/assessments/${assessmentId}/result/${result.attemptId}`
      );
    } catch (err) {
      setError(getErrorMessage(err, "Could not submit attempt."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading attempt...</p>;
  }

  if (error && !attempt) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
        {error}
      </div>
    );
  }

  if (!attempt) {
    return null;
  }

  const isTimeUp = remainingSeconds !== null && remainingSeconds <= 0;

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 rounded-xl border bg-white/95 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-zinc-500">Learning / Assessment</p>
            <h1 className="text-xl font-bold">{attempt.assessmentTitle}</h1>
            <p className="text-sm text-zinc-500">
              Attempt #{attempt.attemptNumber} • {attempt.type}
              {attempt.type !== "PROJECT" &&
                ` • ${answeredCount}/${sortedQuestions.length} answered`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                isTimeUp
                  ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                  : "bg-zinc-100 dark:bg-zinc-800"
              }`}
            >
              {formatTime(remainingSeconds)}
            </span>

            <button
              type="button"
              disabled={submitting}
              onClick={openSubmitModal}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {isTimeUp && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          Time is up. Please submit your attempt.
        </div>
      )}

      {attempt.type === "PROJECT" ? (
        <div className="mx-auto max-w-3xl space-y-5 rounded-xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div>
            <h2 className="text-lg font-semibold">
              {attempt.projectRequirement?.title || "Project submission"}
            </h2>

            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
              {attempt.projectRequirement?.requirement ||
                attempt.assessmentDescription ||
                "Submit your project links and notes."}
            </p>

            {attempt.projectRequirement?.note && (
              <p className="mt-2 text-sm text-zinc-500">
                Note: {attempt.projectRequirement.note}
              </p>
            )}
          </div>

          <ProjectInput
            label="GitHub URL"
            value={projectForm.githubUrl}
            onChange={(value) =>
              setProjectForm((prev) => ({ ...prev, githubUrl: value }))
            }
          />

          <ProjectInput
            label="Deploy URL"
            value={projectForm.deployUrl}
            onChange={(value) =>
              setProjectForm((prev) => ({ ...prev, deployUrl: value }))
            }
          />

          <ProjectInput
            label="Document URL"
            value={projectForm.documentUrl}
            onChange={(value) =>
              setProjectForm((prev) => ({ ...prev, documentUrl: value }))
            }
          />

          <div className="space-y-2">
            <label className="text-sm font-medium">Note</label>
            <textarea
              rows={5}
              value={projectForm.note}
              onChange={(e) =>
                setProjectForm((prev) => ({
                  ...prev,
                  note: e.target.value,
                }))
              }
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="Add a short note for your instructor."
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedQuestions.length === 0 && (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
              This assessment has no questions.
            </div>
          )}

          {sortedQuestions.map((question) => (
            <div
              key={question.questionId}
              className="rounded-xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                  #{question.order}
                </span>

                <span className="rounded-full bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                  {question.type}
                </span>

                <span className="rounded-full bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                  {question.points} pts
                </span>

                {savingQuestionId === question.questionId && (
                  <span className="text-zinc-500">Saving...</span>
                )}
              </div>

              <h2 className="mb-4 font-semibold">{question.questionText}</h2>

              {question.type === "MULTIPLE_CHOICE" ||
              question.type === "TRUE_FALSE" ? (
                <div className="space-y-2">
                  {(question.options || []).map((option) => (
                    <label
                      key={option}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                    >
                      <input
                        type="radio"
                        name={question.questionId}
                        checked={answers[question.questionId] === option}
                        onChange={() => saveAnswer(question.questionId, option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}

                  {(question.options || []).length === 0 && (
                    <p className="text-sm text-zinc-500">
                      No options are available for this question.
                    </p>
                  )}
                </div>
              ) : (
                <textarea
                  value={answers[question.questionId] || ""}
                  onBlur={(e) =>
                    saveAnswer(question.questionId, e.target.value)
                  }
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [question.questionId]: e.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                  placeholder="Type your answer here."
                />
              )}
            </div>
          ))}
        </div>
      )}

      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl border bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-lg font-semibold">Submit attempt?</h2>

            <p className="mt-2 text-sm text-zinc-500">
              Once submitted, you cannot continue editing this attempt.
            </p>

            <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
              <p className="font-medium">{attempt.assessmentTitle}</p>
              <p className="mt-1 text-xs text-zinc-500">
                Attempt #{attempt.attemptNumber} · {attempt.type}
                {attempt.type !== "PROJECT" &&
                  ` · ${answeredCount}/${sortedQuestions.length} answered`}
              </p>
            </div>

            {attempt.type !== "PROJECT" &&
              answeredCount < sortedQuestions.length && (
                <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                  You still have unanswered questions.
                </p>
              )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                disabled={submitting}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Review again
              </button>

              <button
                type="button"
                onClick={confirmSubmit}
                disabled={submitting}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
              >
                {submitting ? "Submitting..." : "Submit attempt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const hasError = Boolean(value.trim()) && !isValidUrl(value);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://..."
        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:bg-zinc-900 ${
          hasError
            ? "border-red-300 dark:border-red-800"
            : "dark:border-zinc-700"
        }`}
      />

      {hasError && (
        <p className="text-xs text-red-600 dark:text-red-300">
          Please enter a valid URL.
        </p>
      )}
    </div>
  );
}