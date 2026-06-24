"use client";

import React, { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { assessmentService } from "@/services/assessment.service";
import type {
  AssessmentType,
  DetailedAssessment,
  UpdateAssessmentPayload,
  UpdatePublishedAssessmentPayload,
} from "@/types/assessment";

type PageProps = {
  params: Promise<{
    id: string;
    assessmentId: string;
  }>;
};

function toDatetimeLocalValue(value?: string | Date | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

function toIsoOrNull(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

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

export default function EditAssessmentPage({ params }: PageProps) {
  const { id: courseId, assessmentId } = use(params);
  const router = useRouter();

  const [assessment, setAssessment] = useState<DetailedAssessment | null>(null);
  const [form, setForm] = useState<UpdateAssessmentPayload>({});
  const [initialForm, setInitialForm] = useState<UpdateAssessmentPayload>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPublished = assessment?.status === "PUBLISHED";

  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }, [form, initialForm]);

  async function loadAssessment() {
    try {
      setLoading(true);
      setError(null);

      const data = await assessmentService.getInstructorAssessmentDetail(
        courseId,
        assessmentId
      );

      const nextForm: UpdateAssessmentPayload = {
        title: data.title,
        description: data.description || "",
        type: data.type,
        order: data.order,
        passingScore: data.passingScore ?? undefined,
        maxAttempts: data.maxAttempts ?? undefined,
        timeLimitMinutes: data.timeLimitMinutes ?? undefined,
        availableFrom: toDatetimeLocalValue(data.availableFrom),
        availableUntil: toDatetimeLocalValue(data.availableUntil),
        isActive: data.isActive,
      };

      setAssessment(data);
      setForm(nextForm);
      setInitialForm(nextForm);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load assessment."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssessment();
  }, [courseId, assessmentId]);

  function update<K extends keyof UpdateAssessmentPayload>(
    key: K,
    value: UpdateAssessmentPayload[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
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

  async function handlePublish() {
    if (!assessment || assessment.status === "PUBLISHED") return;

    try {
      setPublishing(true);
      setError(null);

      await assessmentService.publishAssessment(courseId, assessmentId);
      await loadAssessment();
    } catch (err) {
      setError(getErrorMessage(err, "Could not publish assessment."));
    } finally {
      setPublishing(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError(null);

      const commonPayload: UpdateAssessmentPayload = {
        ...form,
        title: form.title?.trim(),
        description: form.description?.trim() || undefined,
        passingScore:
          form.passingScore === null || form.passingScore === undefined
            ? undefined
            : Number(form.passingScore),
        maxAttempts:
          form.maxAttempts === null || form.maxAttempts === undefined
            ? undefined
            : Number(form.maxAttempts),
        timeLimitMinutes:
          form.type === "QUIZ"
            ? Number(form.timeLimitMinutes || 0) || undefined
            : undefined,
        availableFrom: toIsoOrNull(form.availableFrom as string | undefined),
        availableUntil: toIsoOrNull(form.availableUntil as string | undefined),
      };

      if (isPublished) {
        const publishedPayload: UpdatePublishedAssessmentPayload = {
          availableFrom: commonPayload.availableFrom ?? undefined,
          availableUntil: commonPayload.availableUntil ?? undefined,
          maxAttempts: commonPayload.maxAttempts ?? undefined,
          timeLimitMinutes: commonPayload.timeLimitMinutes ?? undefined,
          isActive: commonPayload.isActive,
        };

        await assessmentService.updatePublishedAssessment(
          courseId,
          assessmentId,
          publishedPayload
        );
      } else {
        await assessmentService.updateAssessment(
          courseId,
          assessmentId,
          commonPayload
        );
      }

      router.push(`/instructor/courses/${courseId}/assessments`);
    } catch (err) {
      setError(getErrorMessage(err, "Could not save assessment."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-zinc-500">Loading assessment...</p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          Assessment not found.
        </div>
        <Link
          href={`/instructor/courses/${courseId}/assessments`}
          className="inline-flex rounded-lg border px-4 py-2 text-sm dark:border-zinc-700"
        >
          Back to assessments
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">Instructor / Assessment</p>
          <h1 className="text-2xl font-bold">Edit assessment</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {isPublished
              ? "This assessment is published. You can only update safe settings such as availability, attempts, time limit, and active status."
              : "Update draft content, questions, answer keys, and assessment settings."}
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/instructor/courses/${courseId}/assessments/${assessmentId}/questions`}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Questions
          </Link>

          {!isPublished && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {publishing ? "Publishing..." : "Publish"}
            </button>
          )}
        </div>
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
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Title</label>
            <input
              disabled={isPublished}
              value={form.title || ""}
              onChange={(e) => update("title", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:disabled:bg-zinc-900"
              placeholder="Example: JavaScript fundamentals quiz"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              disabled={isPublished}
              rows={4}
              value={form.description || ""}
              onChange={(e) => update("description", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:disabled:bg-zinc-900"
              placeholder="Describe what this assessment is about."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <select
              disabled={isPublished}
              value={form.type || "QUIZ"}
              onChange={(e) => {
                const nextType = e.target.value as AssessmentType;
                update("type", nextType);

                if (nextType !== "QUIZ") {
                  update("timeLimitMinutes", undefined);
                }
              }}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:disabled:bg-zinc-900"
            >
              <option value="QUIZ">Quiz</option>
              <option value="PROJECT">Project</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Order</label>
            <input
              disabled={isPublished}
              type="number"
              min={0}
              value={form.order ?? 0}
              onChange={(e) => update("order", Number(e.target.value))}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:disabled:bg-zinc-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Passing score (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.passingScore ?? ""}
              onChange={(e) =>
                update(
                  "passingScore",
                  e.target.value ? Number(e.target.value) : undefined
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
              value={form.maxAttempts ?? ""}
              onChange={(e) =>
                update(
                  "maxAttempts",
                  e.target.value ? Number(e.target.value) : undefined
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
                value={form.timeLimitMinutes ?? ""}
                onChange={(e) =>
                  update(
                    "timeLimitMinutes",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="Example: 30"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Available from</label>
            <input
              type="datetime-local"
              value={(form.availableFrom as string) || ""}
              onChange={(e) =>
                update("availableFrom", e.target.value || undefined)
              }
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Available until</label>
            <input
              type="datetime-local"
              value={(form.availableUntil as string) || ""}
              onChange={(e) =>
                update("availableUntil", e.target.value || undefined)
              }
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm dark:border-zinc-700">
            <input
              type="checkbox"
              checked={Boolean(form.isActive)}
              onChange={(e) => update("isActive", e.target.checked)}
            />
            Active
          </label>
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
            disabled={saving || !isDirty}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>

      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl border bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-lg font-semibold">Discard changes?</h2>
            <p className="mt-2 text-sm text-zinc-500">
              You have unsaved changes. If you leave this page now, your changes
              will be lost.
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