"use client";

import React, { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { assessmentService } from "@/services/assessment.service";
import type {
  AssessmentQuestion,
  AssessmentQuestionType,
  DetailedAssessment,
  UpsertAssessmentAnswerPayload,
} from "@/types/assessment";

type PageProps = {
  params: Promise<{
    id: string;
    assessmentId: string;
  }>;
};

type QuestionFormState = {
  questionText: string;
  type: AssessmentQuestionType;
  explanation: string;
  points: number;
  correctOptionAnswer: string;
  correctTextAnswer: string;
  wrongAnswersText: string;
};

const emptyForm: QuestionFormState = {
  questionText: "",
  type: "MULTIPLE_CHOICE",
  explanation: "",
  points: 1,
  correctOptionAnswer: "",
  correctTextAnswer: "",
  wrongAnswersText: "",
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

export default function AssessmentQuestionsPage({ params }: PageProps) {
  const { id: courseId, assessmentId } = use(params);

  const [assessment, setAssessment] = useState<DetailedAssessment | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null
  );
  const [questionToDelete, setQuestionToDelete] =
    useState<AssessmentQuestion | null>(null);

  const [form, setForm] = useState<QuestionFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedQuestions = useMemo(() => {
    return [...(assessment?.questions || [])].sort(
      (a, b) => a.order - b.order
    );
  }, [assessment]);

  async function loadAssessment() {
    try {
      setLoading(true);
      setError(null);

      const data = await assessmentService.getInstructorAssessmentDetail(
        courseId,
        assessmentId
      );

      setAssessment(data);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load questions."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssessment();
  }, [courseId, assessmentId]);

  function update<K extends keyof QuestionFormState>(
    key: K,
    value: QuestionFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startEdit(question: AssessmentQuestion) {
    setEditingQuestionId(question.id);

    setForm({
      questionText: question.questionText,
      type: question.type,
      explanation: question.explanation || "",
      points: question.points,
      correctOptionAnswer: question.answer?.correctOptionAnswer || "",
      correctTextAnswer: question.answer?.correctTextAnswer || "",
      wrongAnswersText: Array.isArray(question.answer?.wrongAnswers)
        ? question.answer.wrongAnswers.join("\n")
        : "",
    });
  }

  function resetForm() {
    setEditingQuestionId(null);
    setForm(emptyForm);
    setError(null);
  }

  function buildAnswerPayload(): UpsertAssessmentAnswerPayload {
    const wrongAnswers = form.wrongAnswersText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    if (form.type === "FILL_IN_THE_BLANK") {
      return {
        correctTextAnswer: form.correctTextAnswer.trim(),
        correctOptionAnswer: undefined,
        wrongAnswers: undefined,
      };
    }

    return {
      correctOptionAnswer: form.correctOptionAnswer.trim(),
      correctTextAnswer: undefined,
      wrongAnswers: form.type === "MULTIPLE_CHOICE" ? wrongAnswers : undefined,
    };
  }

  function validateForm() {
    if (!form.questionText.trim()) {
      return "Question text is required.";
    }

    if (Number(form.points) < 1 || Number(form.points) > 100) {
      return "Points must be between 1 and 100.";
    }

    if (form.type === "FILL_IN_THE_BLANK" && !form.correctTextAnswer.trim()) {
      return "Correct text answer is required.";
    }

    if (form.type !== "FILL_IN_THE_BLANK" && !form.correctOptionAnswer.trim()) {
      return "Correct option answer is required.";
    }

    if (
      form.type === "MULTIPLE_CHOICE" &&
      form.wrongAnswersText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean).length === 0
    ) {
      return "At least one wrong answer is required for multiple choice questions.";
    }

    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const questionPayload = {
        questionText: form.questionText.trim(),
        type: form.type,
        explanation: form.explanation.trim() || undefined,
        points: Number(form.points) || 1,
      };

      const question = editingQuestionId
        ? await assessmentService.updateQuestion(
            courseId,
            assessmentId,
            editingQuestionId,
            questionPayload
          )
        : await assessmentService.createQuestion(
            courseId,
            assessmentId,
            questionPayload
          );

      const questionId = question?.id || editingQuestionId;

      if (!questionId) {
        throw new Error("Question ID was not returned from the server.");
      }

      await assessmentService.upsertAnswer(
        courseId,
        assessmentId,
        questionId,
        buildAnswerPayload()
      );

      resetForm();
      await loadAssessment();
    } catch (err) {
      setError(getErrorMessage(err, "Could not save question."));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteQuestion() {
    if (!questionToDelete) return;

    try {
      setDeleting(true);
      setError(null);

      await assessmentService.deleteQuestion(
        courseId,
        assessmentId,
        questionToDelete.id
      );

      if (editingQuestionId === questionToDelete.id) {
        resetForm();
      }

      setQuestionToDelete(null);
      await loadAssessment();
    } catch (err) {
      setError(getErrorMessage(err, "Could not delete question."));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-500">Loading questions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-zinc-500">Instructor / Assessment</p>
          <h1 className="text-2xl font-bold">Question editor</h1>
          <p className="text-sm text-zinc-500">
            {assessment?.title || "Assessment questions"}
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/instructor/courses/${courseId}/assessments/${assessmentId}/edit`}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Edit assessment
          </Link>

          <Link
            href={`/instructor/courses/${courseId}/assessments`}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Back to assessments
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          {sortedQuestions.length === 0 && (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
              No questions have been added yet.
            </div>
          )}

          {sortedQuestions.map((question) => (
            <div
              key={question.id}
              className="rounded-xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                      #{question.order}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                      {question.type}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                      {question.points} pts
                    </span>
                  </div>

                  <h2 className="font-semibold">{question.questionText}</h2>

                  {question.explanation && (
                    <p className="text-sm text-zinc-500">
                      Explanation: {question.explanation}
                    </p>
                  )}

                  <div className="space-y-1 text-sm text-zinc-500">
                    {question.type === "FILL_IN_THE_BLANK" ? (
                      <p>
                        Correct text:{" "}
                        {question.answer?.correctTextAnswer || "Not set"}
                      </p>
                    ) : (
                      <>
                        <p>
                          Correct option:{" "}
                          {question.answer?.correctOptionAnswer || "Not set"}
                        </p>
                        <p>
                          Wrong options:{" "}
                          {Array.isArray(question.answer?.wrongAnswers) &&
                          question.answer.wrongAnswers.length > 0
                            ? question.answer.wrongAnswers.join(", ")
                            : "None"}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(question)}
                    className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuestionToDelete(question)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          className="h-fit space-y-4 rounded-xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div>
            <h2 className="font-semibold">
              {editingQuestionId ? "Edit question" : "Add question"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Add the question content and its answer key.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Question text</label>
            <textarea
              required
              rows={4}
              value={form.questionText}
              onChange={(e) => update("questionText", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="Example: What is the output of typeof null?"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select
                value={form.type}
                onChange={(e) => {
                  const nextType = e.target.value as AssessmentQuestionType;

                  setForm((prev) => ({
                    ...prev,
                    type: nextType,
                    correctOptionAnswer:
                      nextType === "FILL_IN_THE_BLANK"
                        ? ""
                        : prev.correctOptionAnswer,
                    correctTextAnswer:
                      nextType === "FILL_IN_THE_BLANK"
                        ? prev.correctTextAnswer
                        : "",
                    wrongAnswersText:
                      nextType === "MULTIPLE_CHOICE"
                        ? prev.wrongAnswersText
                        : "",
                  }));
                }}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="MULTIPLE_CHOICE">Multiple choice</option>
                <option value="TRUE_FALSE">True / False</option>
                <option value="FILL_IN_THE_BLANK">Fill in the blank</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Points</label>
              <input
                type="number"
                min={1}
                max={100}
                value={form.points}
                onChange={(e) => update("points", Number(e.target.value))}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          </div>

          {form.type === "FILL_IN_THE_BLANK" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Correct text answer</label>
              <input
                required
                value={form.correctTextAnswer}
                onChange={(e) => update("correctTextAnswer", e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="Example: JavaScript"
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Correct option answer
                </label>
                <input
                  required
                  value={form.correctOptionAnswer}
                  onChange={(e) =>
                    update("correctOptionAnswer", e.target.value)
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                  placeholder={
                    form.type === "TRUE_FALSE"
                      ? "Example: true"
                      : "Example: object"
                  }
                />
              </div>

              {form.type === "MULTIPLE_CHOICE" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Wrong answers, one per line
                  </label>
                  <textarea
                    rows={4}
                    value={form.wrongAnswersText}
                    onChange={(e) =>
                      update("wrongAnswersText", e.target.value)
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                    placeholder={"string\nnumber\nundefined"}
                  />
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Explanation</label>
            <textarea
              rows={3}
              value={form.explanation}
              onChange={(e) => update("explanation", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="Optional explanation shown in review mode."
            />
          </div>

          <div className="flex justify-end gap-2">
            {editingQuestionId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
            )}

            <button
              disabled={saving}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
            >
              {saving ? "Saving..." : editingQuestionId ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </div>

      {questionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl border bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-lg font-semibold">Delete question?</h2>

            <p className="mt-2 text-sm text-zinc-500">
              This question will be removed from the draft assessment. This
              action cannot be undone.
            </p>

            <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
              <p className="line-clamp-3 font-medium">
                {questionToDelete.questionText}
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setQuestionToDelete(null)}
                disabled={deleting}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteQuestion}
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