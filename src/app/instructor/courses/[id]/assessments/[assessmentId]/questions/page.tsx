"use client";

import React, { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  FileQuestion,
  Pencil,
  PlusCircle,
  Trash2,
  XCircle,
} from "lucide-react";
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

  if (err instanceof Error) {
    return err.message;
  }

  return fallback;
}

function questionTypeLabel(type: AssessmentQuestionType) {
  if (type === "MULTIPLE_CHOICE") return "Multiple choice";
  if (type === "TRUE_FALSE") return "True / False";
  if (type === "FILL_IN_THE_BLANK") return "Fill in the blank";
  return type;
}

function getWrongAnswersText(question: AssessmentQuestion) {
  if (!Array.isArray(question.answer?.wrongAnswers)) return "";
  return question.answer.wrongAnswers.join("\n");
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

  const [errorModalMessage, setErrorModalMessage] = useState<string | null>(
    null
  );
  const [successModalMessage, setSuccessModalMessage] = useState<string | null>(
    null
  );

  const sortedQuestions = useMemo(() => {
    return [...(assessment?.questions || [])].sort(
      (a, b) => a.order - b.order
    );
  }, [assessment]);

  const totalPoints = useMemo(() => {
    return sortedQuestions.reduce(
      (total, question) => total + Number(question.points || 0),
      0
    );
  }, [sortedQuestions]);

  const isEditing = Boolean(editingQuestionId);

  function showError(message: string) {
    setSuccessModalMessage(null);
    setErrorModalMessage(message);
  }

  function showSuccess(message: string) {
    setErrorModalMessage(null);
    setSuccessModalMessage(message);
  }

  async function loadAssessment() {
    try {
      setLoading(true);
      setErrorModalMessage(null);

      const data = await assessmentService.getInstructorAssessmentDetail(
        courseId,
        assessmentId
      );

      setAssessment(data);
    } catch (err) {
      showError(getErrorMessage(err, "Could not load questions."));
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

  function handleTypeChange(nextType: AssessmentQuestionType) {
    setForm((prev) => ({
      ...prev,
      type: nextType,
      correctOptionAnswer:
        nextType === "FILL_IN_THE_BLANK"
          ? ""
          : nextType === "TRUE_FALSE"
            ? prev.correctOptionAnswer === "false"
              ? "false"
              : "true"
            : prev.correctOptionAnswer,
      correctTextAnswer:
        nextType === "FILL_IN_THE_BLANK" ? prev.correctTextAnswer : "",
      wrongAnswersText:
        nextType === "MULTIPLE_CHOICE" ? prev.wrongAnswersText : "",
    }));
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
      wrongAnswersText: getWrongAnswersText(question),
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function resetForm() {
    setEditingQuestionId(null);
    setForm(emptyForm);
    setErrorModalMessage(null);
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

    if (form.type === "TRUE_FALSE") {
      return {
        correctOptionAnswer: form.correctOptionAnswer || "true",
        correctTextAnswer: undefined,
        wrongAnswers: undefined,
      };
    }

    return {
      correctOptionAnswer: form.correctOptionAnswer.trim(),
      correctTextAnswer: undefined,
      wrongAnswers,
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
      showError(validationError);
      return;
    }

    try {
      setSaving(true);
      setErrorModalMessage(null);
      setSuccessModalMessage(null);

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

      showSuccess(
        editingQuestionId
          ? "Question updated successfully."
          : "Question added successfully."
      );
    } catch (err) {
      showError(getErrorMessage(err, "Could not save question."));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteQuestion() {
    if (!questionToDelete) return;

    try {
      setDeleting(true);
      setErrorModalMessage(null);
      setSuccessModalMessage(null);

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

      showSuccess("Question deleted successfully.");
    } catch (err) {
      showError(getErrorMessage(err, "Could not delete question."));
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

        <div className="flex flex-wrap gap-2">
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

      <section className="rounded-2xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-5 flex flex-col gap-3 border-b pb-4 dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <Pencil className="h-5 w-5 text-zinc-500" />
              ) : (
                <PlusCircle className="h-5 w-5 text-zinc-500" />
              )}

              <h2 className="text-lg font-semibold">
                {isEditing ? "Edit question" : "Add new question"}
              </h2>
            </div>

            <p className="mt-1 text-sm text-zinc-500">
              Nhập câu hỏi ở đây. Sau khi thêm, câu hỏi sẽ nằm trong danh sách
              bên dưới.
            </p>
          </div>

          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="w-fit rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Cancel edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Question type</label>
              <select
                value={form.type}
                onChange={(e) =>
                  handleTypeChange(e.target.value as AssessmentQuestionType)
                }
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
          ) : form.type === "TRUE_FALSE" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Correct answer</label>
              <select
                value={form.correctOptionAnswer || "true"}
                onChange={(e) => update("correctOptionAnswer", e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
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
                  placeholder="Example: object"
                />
              </div>

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
            </div>
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

          <div className="flex justify-end gap-2 border-t pt-4 dark:border-zinc-800">
            {isEditing && (
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
              className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
            >
              {saving ? (
                "Saving..."
              ) : isEditing ? (
                <>
                  <Pencil className="mr-2 h-4 w-4" />
                  Update question
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add question
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Question list</h2>
            <p className="text-sm text-zinc-500">
              {sortedQuestions.length} questions · {totalPoints} total points
            </p>
          </div>
        </div>

        {sortedQuestions.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
            <FileQuestion className="mx-auto h-9 w-9 text-zinc-300" />
            <p className="mt-3 font-medium text-zinc-700 dark:text-zinc-200">
              No questions have been added yet.
            </p>
            <p className="mt-1 text-zinc-500">
              Hãy nhập câu hỏi ở form phía trên rồi bấm Add question.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {sortedQuestions.map((question, index) => {
              const activeEditing = editingQuestionId === question.id;

              return (
                <article
                  key={question.id}
                  className={`rounded-2xl border bg-white p-5 shadow-sm transition dark:border-zinc-800 dark:bg-zinc-950 ${activeEditing
                    ? "border-zinc-900 ring-2 ring-zinc-900/10 dark:border-white dark:ring-white/10"
                    : ""
                    }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-zinc-900 px-2.5 py-1 font-medium text-white dark:bg-white dark:text-zinc-900">
                          Q{index + 1}
                        </span>

                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                          Order #{question.order}
                        </span>

                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                          {questionTypeLabel(question.type)}
                        </span>

                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                          {question.points} pts
                        </span>

                        {activeEditing && (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                            Editing
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-semibold leading-7 text-zinc-950 dark:text-zinc-50">
                        {question.questionText}
                      </h3>

                      <div className="grid gap-3 text-sm md:grid-cols-2">
                        {question.type === "FILL_IN_THE_BLANK" ? (
                          <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900">
                            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                              Correct text
                            </p>
                            <p className="mt-1 text-zinc-700 dark:text-zinc-200">
                              {question.answer?.correctTextAnswer || "Not set"}
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/30">
                              <p className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                                Correct option
                              </p>
                              <p className="mt-1 text-zinc-700 dark:text-zinc-200">
                                {question.answer?.correctOptionAnswer ||
                                  "Not set"}
                              </p>
                            </div>

                            <div className="rounded-xl bg-red-50 p-3 dark:bg-red-950/30">
                              <p className="text-xs font-medium uppercase tracking-wide text-red-600 dark:text-red-300">
                                Wrong options
                              </p>
                              <p className="mt-1 text-zinc-700 dark:text-zinc-200">
                                {Array.isArray(question.answer?.wrongAnswers) &&
                                  question.answer.wrongAnswers.length > 0
                                  ? question.answer.wrongAnswers.join(", ")
                                  : "None"}
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      {question.explanation && (
                        <div className="rounded-xl bg-blue-50 p-3 text-sm dark:bg-blue-950/30">
                          <p className="text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-blue-300">
                            Explanation
                          </p>
                          <p className="mt-1 whitespace-pre-line text-zinc-700 dark:text-zinc-200">
                            {question.explanation}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(question)}
                        className="inline-flex items-center rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => setQuestionToDelete(question)}
                        className="inline-flex items-center rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

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
                className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {errorModalMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
                <XCircle className="h-5 w-5 text-red-700 dark:text-red-300" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Something went wrong
                </h2>

                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
                  {errorModalMessage}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setErrorModalMessage(null)}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {successModalMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
                <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Success
                </h2>

                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
                  {successModalMessage}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSuccessModalMessage(null)}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}