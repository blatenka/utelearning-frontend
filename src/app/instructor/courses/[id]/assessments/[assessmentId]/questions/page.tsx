"use client";

import React, { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  FileQuestion,
  Pencil,
  PlusCircle,
  Trash2,
  X,
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
  multipleChoiceOptions: string[];
  correctOptionIndex: number;
  trueFalseCorrectAnswer: "true" | "false";
  correctTextAnswer: string;
};

const emptyForm: QuestionFormState = {
  questionText: "",
  type: "MULTIPLE_CHOICE",
  explanation: "",
  points: 1,
  multipleChoiceOptions: ["", "", "", ""],
  correctOptionIndex: 0,
  trueFalseCorrectAnswer: "true",
  correctTextAnswer: "",
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

function normalizeMultipleChoiceOptions(question: AssessmentQuestion) {
  const correctAnswer = question.answer?.correctOptionAnswer || "";
  const wrongAnswers = Array.isArray(question.answer?.wrongAnswers)
    ? question.answer.wrongAnswers
    : [];

  const options = [correctAnswer, ...wrongAnswers]
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);

  while (options.length < 4) {
    options.push("");
  }

  return options;
}

function getCorrectOptionIndex(
  options: string[],
  correctAnswer?: string | null
) {
  const index = options.findIndex(
    (option) => option.trim() === correctAnswer?.trim()
  );

  return index >= 0 ? index : 0;
}

export default function AssessmentQuestionsPage({ params }: PageProps) {
  const { id: courseId, assessmentId } = use(params);

  const [assessment, setAssessment] = useState<DetailedAssessment | null>(null);

  const [form, setForm] = useState<QuestionFormState>(emptyForm);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null
  );
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);

  const [questionToDelete, setQuestionToDelete] =
    useState<AssessmentQuestion | null>(null);

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

  function updateMultipleChoiceOption(index: number, value: string) {
    setForm((prev) => {
      const nextOptions = [...prev.multipleChoiceOptions];
      nextOptions[index] = value;

      return {
        ...prev,
        multipleChoiceOptions: nextOptions,
      };
    });
  }

  function handleTypeChange(nextType: AssessmentQuestionType) {
    setForm((prev) => ({
      ...prev,
      type: nextType,
      multipleChoiceOptions:
        nextType === "MULTIPLE_CHOICE"
          ? prev.multipleChoiceOptions.length === 4
            ? prev.multipleChoiceOptions
            : ["", "", "", ""]
          : prev.multipleChoiceOptions,
      correctOptionIndex: 0,
      trueFalseCorrectAnswer:
        nextType === "TRUE_FALSE" ? prev.trueFalseCorrectAnswer : "true",
      correctTextAnswer:
        nextType === "FILL_IN_THE_BLANK" ? prev.correctTextAnswer : "",
    }));
  }

  function openCreateModal() {
    setEditingQuestionId(null);
    setForm(emptyForm);
    setErrorModalMessage(null);
    setIsQuestionModalOpen(true);
  }

  function openEditModal(question: AssessmentQuestion) {
    const options =
      question.type === "MULTIPLE_CHOICE"
        ? normalizeMultipleChoiceOptions(question)
        : ["", "", "", ""];

    setEditingQuestionId(question.id);

    setForm({
      questionText: question.questionText,
      type: question.type,
      explanation: question.explanation || "",
      points: question.points || 1,
      multipleChoiceOptions: options,
      correctOptionIndex: getCorrectOptionIndex(
        options,
        question.answer?.correctOptionAnswer
      ),
      trueFalseCorrectAnswer:
        question.answer?.correctOptionAnswer === "false" ? "false" : "true",
      correctTextAnswer: question.answer?.correctTextAnswer || "",
    });

    setErrorModalMessage(null);
    setIsQuestionModalOpen(true);
  }

  function closeQuestionModal() {
    if (saving) return;

    setIsQuestionModalOpen(false);
    setEditingQuestionId(null);
    setForm(emptyForm);
  }

  function buildAnswerPayload(): UpsertAssessmentAnswerPayload {
    if (form.type === "FILL_IN_THE_BLANK") {
      return {
        correctTextAnswer: form.correctTextAnswer.trim(),
        correctOptionAnswer: undefined,
        wrongAnswers: undefined,
      };
    }

    if (form.type === "TRUE_FALSE") {
      return {
        correctOptionAnswer: form.trueFalseCorrectAnswer,
        correctTextAnswer: undefined,
        wrongAnswers: undefined,
      };
    }

    const options = form.multipleChoiceOptions.map((item) => item.trim());
    const correctOptionAnswer = options[form.correctOptionIndex];

    const wrongAnswers = options.filter(
      (_, index) => index !== form.correctOptionIndex
    );

    return {
      correctOptionAnswer,
      correctTextAnswer: undefined,
      wrongAnswers,
    };
  }

  function validateForm() {
    if (!form.questionText.trim()) {
      return "Please enter the question text.";
    }

    if (Number(form.points) < 1 || Number(form.points) > 100) {
      return "Points must be between 1 and 100.";
    }

    if (form.type === "FILL_IN_THE_BLANK" && !form.correctTextAnswer.trim()) {
      return "Please enter the correct answer for the fill-in-the-blank question.";
    }

    if (form.type === "MULTIPLE_CHOICE") {
      const options = form.multipleChoiceOptions.map((item) => item.trim());

      if (options.some((item) => !item)) {
        return "Please enter all 4 options for the multiple-choice question.";
      }

      const duplicatedOptions = options.filter(
        (item, index) => options.indexOf(item) !== index
      );

      if (duplicatedOptions.length > 0) {
        return "Multiple-choice options must not be duplicated.";
      }

      if (!options[form.correctOptionIndex]) {
        return "Please select the correct option.";
      }
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

    const wasEditing = Boolean(editingQuestionId);

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
        throw new Error("The server did not return the question ID.");
      }

      await assessmentService.upsertAnswer(
        courseId,
        assessmentId,
        questionId,
        buildAnswerPayload()
      );

      setIsQuestionModalOpen(false);
      setEditingQuestionId(null);
      setForm(emptyForm);

      await loadAssessment();

      showSuccess(
        wasEditing
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

      setQuestionToDelete(null);

      if (editingQuestionId === questionToDelete.id) {
        setEditingQuestionId(null);
        setForm(emptyForm);
        setIsQuestionModalOpen(false);
      }

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

          <h1 className="text-2xl font-bold">Question Management</h1>

          <p className="mt-1 text-sm text-zinc-500">
            {assessment?.title || "Assessment question list"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add question
          </button>

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
            Back
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500">Questions</p>
            <p className="mt-1 text-2xl font-bold">{sortedQuestions.length}</p>
          </div>

          <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500">Total points</p>
            <p className="mt-1 text-2xl font-bold">{totalPoints}</p>
          </div>

          <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500">Assessment type</p>
            <p className="mt-1 text-2xl font-bold">
              {assessment?.type === "PROJECT" ? "Project" : "Quiz"}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Question list</h2>

            <p className="text-sm text-zinc-500">
              {sortedQuestions.length} questions · {totalPoints} points
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
              Click “Add question” to create the first question for this
              assessment.
            </p>

            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add question
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {sortedQuestions.map((question, index) => {
              return (
                <article
                  key={question.id}
                  className="rounded-2xl border bg-white p-5 shadow-sm transition dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-zinc-900 px-2.5 py-1 font-medium text-white dark:bg-white dark:text-zinc-900">
                          Question {index + 1}
                        </span>

                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                          Order #{question.order}
                        </span>

                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                          {questionTypeLabel(question.type)}
                        </span>

                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                          {question.points} points
                        </span>
                      </div>

                      <h3 className="text-base font-semibold leading-7 text-zinc-950 dark:text-zinc-50">
                        {question.questionText}
                      </h3>

                      <div className="grid gap-3 text-sm md:grid-cols-2">
                        {question.type === "FILL_IN_THE_BLANK" ? (
                          <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/30">
                            <p className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                              Correct answer
                            </p>

                            <p className="mt-1 text-zinc-700 dark:text-zinc-200">
                              {question.answer?.correctTextAnswer || "Not set"}
                            </p>
                          </div>
                        ) : question.type === "TRUE_FALSE" ? (
                          <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/30">
                            <p className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                              Correct answer
                            </p>

                            <p className="mt-1 text-zinc-700 dark:text-zinc-200">
                              {question.answer?.correctOptionAnswer === "false"
                                ? "False"
                                : "True"}
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
                                  : "Not set"}
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
                        onClick={() => openEditModal(question)}
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

      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-start justify-between gap-4 border-b p-5 dark:border-zinc-800">
              <div>
                <h2 className="text-lg font-semibold">
                  {isEditing ? "Edit question" : "Add new question"}
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Enter the question content, choose the question type, and set
                  the correct answer.
                </p>
              </div>

              <button
                type="button"
                onClick={closeQuestionModal}
                disabled={saving}
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex-1 space-y-5 overflow-y-auto p-5"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Question text</label>

                <textarea
                  required
                  rows={4}
                  value={form.questionText}
                  onChange={(e) => update("questionText", e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                  placeholder="Example: What is the result of typeof null in JavaScript?"
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
                    <option value="FILL_IN_THE_BLANK">
                      Fill in the blank
                    </option>
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

              {form.type === "MULTIPLE_CHOICE" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Answer options</label>

                    <p className="mt-1 text-xs text-zinc-500">
                      Enter all 4 options, then select one correct answer.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {form.multipleChoiceOptions.map((option, index) => {
                      const optionLabel = String.fromCharCode(65 + index);

                      return (
                        <label
                          key={index}
                          className={`flex gap-3 rounded-xl border p-3 transition dark:border-zinc-800 ${form.correctOptionIndex === index
                            ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
                            : "bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                            }`}
                        >
                          <input
                            type="radio"
                            name="correctOption"
                            checked={form.correctOptionIndex === index}
                            onChange={() => update("correctOptionIndex", index)}
                            className="mt-3"
                          />

                          <div className="flex-1">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <span className="text-sm font-medium">
                                Option {optionLabel}
                              </span>

                              {form.correctOptionIndex === index && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                  Correct answer
                                </span>
                              )}
                            </div>

                            <input
                              required
                              value={option}
                              onChange={(e) =>
                                updateMultipleChoiceOption(
                                  index,
                                  e.target.value
                                )
                              }
                              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                              placeholder={`Enter option ${optionLabel}`}
                            />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {form.type === "TRUE_FALSE" && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">Correct answer</label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 dark:border-zinc-800 ${form.trueFalseCorrectAnswer === "true"
                        ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        }`}
                    >
                      <input
                        type="radio"
                        name="trueFalseCorrectAnswer"
                        checked={form.trueFalseCorrectAnswer === "true"}
                        onChange={() =>
                          update("trueFalseCorrectAnswer", "true")
                        }
                      />

                      <span className="text-sm font-medium">True</span>
                    </label>

                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 dark:border-zinc-800 ${form.trueFalseCorrectAnswer === "false"
                        ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        }`}
                    >
                      <input
                        type="radio"
                        name="trueFalseCorrectAnswer"
                        checked={form.trueFalseCorrectAnswer === "false"}
                        onChange={() =>
                          update("trueFalseCorrectAnswer", "false")
                        }
                      />

                      <span className="text-sm font-medium">False</span>
                    </label>
                  </div>
                </div>
              )}

              {form.type === "FILL_IN_THE_BLANK" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Correct answer</label>

                  <input
                    required
                    value={form.correctTextAnswer}
                    onChange={(e) =>
                      update("correctTextAnswer", e.target.value)
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                    placeholder="Example: JavaScript"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Answer explanation
                </label>

                <textarea
                  rows={3}
                  value={form.explanation}
                  onChange={(e) => update("explanation", e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                  placeholder="Optional. This explanation can be shown when learners review their result."
                />
              </div>

              <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-2 border-t bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                <button
                  type="button"
                  onClick={closeQuestionModal}
                  disabled={saving}
                  className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  Cancel
                </button>

                <button
                  disabled={saving}
                  className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
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
          </div>
        </div>
      )}

      {questionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl border bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-lg font-semibold">Delete question?</h2>

            <p className="mt-2 text-sm text-zinc-500">
              This question will be removed from the assessment. This action
              cannot be undone.
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
                {deleting ? "Deleting..." : "Delete question"}
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