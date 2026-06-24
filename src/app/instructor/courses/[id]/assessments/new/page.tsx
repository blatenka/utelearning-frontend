"use client";

import React, { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { assessmentService } from "@/services/assessment.service";
import type {
  AssessmentType,
  CreateAssessmentPayload,
} from "@/types/assessment";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type FormState = {
  title: string;
  description: string;
  type: AssessmentType;
  passingScore: number | "";
  maxAttempts: number | "";
  timeLimitMinutes: number | "";
  availableFrom: string;
  availableUntil: string;
};

const initialForm: FormState = {
  title: "",
  description: "",
  type: "QUIZ",
  passingScore: 70,
  maxAttempts: 1,
  timeLimitMinutes: 30,
  availableFrom: "",
  availableUntil: "",
};

function toIsoOrUndefined(value: string) {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  return date.toISOString();
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

  return fallback;
}

export default function NewAssessmentPage({ params }: PageProps) {
  const { id: courseId } = use(params);
  const router = useRouter();

  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }, [form]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleTypeChange(type: AssessmentType) {
    setForm((prev) => ({
      ...prev,
      type,
      timeLimitMinutes: type === "QUIZ" ? prev.timeLimitMinutes || 30 : "",
    }));
  }

  function validateForm() {
    if (!form.title.trim()) {
      return "Title is required.";
    }

    if (
      form.passingScore !== "" &&
      (Number(form.passingScore) < 0 || Number(form.passingScore) > 100)
    ) {
      return "Passing score must be between 0 and 100.";
    }

    if (
      form.maxAttempts !== "" &&
      (Number(form.maxAttempts) < 1 || Number(form.maxAttempts) > 10)
    ) {
      return "Max attempts must be between 1 and 10.";
    }

    if (
      form.type === "QUIZ" &&
      form.timeLimitMinutes !== "" &&
      (Number(form.timeLimitMinutes) < 1 || Number(form.timeLimitMinutes) > 60)
    ) {
      return "Time limit must be between 1 and 60 minutes.";
    }

    if (form.availableFrom && form.availableUntil) {
      const from = new Date(form.availableFrom).getTime();
      const until = new Date(form.availableUntil).getTime();

      if (!Number.isNaN(from) && !Number.isNaN(until) && until <= from) {
        return "Available until must be after available from.";
      }
    }

    return null;
  }

  function handleCancel() {
    if (isDirty) {
      setShowCancelModal(true);
      return;
    }

    router.back();
  }

  function discardChanges() {
    setShowCancelModal(false);
    router.back();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: CreateAssessmentPayload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        passingScore:
          form.passingScore === "" ? undefined : Number(form.passingScore),
        maxAttempts:
          form.maxAttempts === "" ? undefined : Number(form.maxAttempts),
        timeLimitMinutes:
          form.type === "QUIZ" && form.timeLimitMinutes !== ""
            ? Number(form.timeLimitMinutes)
            : undefined,
        availableFrom: toIsoOrUndefined(form.availableFrom),
        availableUntil: toIsoOrUndefined(form.availableUntil),
      };

      const created = await assessmentService.createAssessment(
        courseId,
        payload
      );

      router.push(
        `/instructor/courses/${courseId}/assessments/${created.id}/questions`
      );
    } catch (err) {
      setError(getErrorMessage(err, "Could not create assessment."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm text-zinc-500">Instructor / Assessment</p>
        <h1 className="text-2xl font-bold">New assessment</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Create a quiz or project for this course.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Title</label>
          <input
            required
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="Example: JavaScript fundamentals quiz"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={4}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="Describe what learners need to complete."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <select
              value={form.type}
              onChange={(e) => handleTypeChange(e.target.value as AssessmentType)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="QUIZ">Quiz</option>
              <option value="PROJECT">Project</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Passing score (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.passingScore}
              onChange={(e) =>
                update(
                  "passingScore",
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="Example: 70"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Max attempts</label>
            <input
              type="number"
              min={1}
              max={10}
              value={form.maxAttempts}
              onChange={(e) =>
                update(
                  "maxAttempts",
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="Leave empty for unlimited"
            />
          </div>

          {form.type === "QUIZ" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Time limit minutes</label>
              <input
                type="number"
                min={1}
                max={60}
                value={form.timeLimitMinutes}
                onChange={(e) =>
                  update(
                    "timeLimitMinutes",
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="Example: 30"
              />
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Available from</label>
            <input
              type="datetime-local"
              value={form.availableFrom}
              onChange={(e) => update("availableFrom", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Available until</label>
            <input
              type="datetime-local"
              value={form.availableUntil}
              onChange={(e) => update("availableUntil", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Cancel
          </button>

          <button
            disabled={loading}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
          >
            {loading ? "Creating..." : "Create assessment"}
          </button>
        </div>
      </form>

      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl border bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-lg font-semibold">Discard assessment?</h2>

            <p className="mt-2 text-sm text-zinc-500">
              You have unsaved changes. If you leave this page now, this draft
              assessment will not be created.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Keep editing
              </button>

              <button
                type="button"
                onClick={discardChanges}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}