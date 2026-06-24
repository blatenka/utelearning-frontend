"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { assessmentService } from "@/services/assessment.service";
import type { LearnerAssessment } from "@/types/assessment";

type PageProps = { params: Promise<{ courseId: string }> };

export default function LearnerAssessmentsPage({ params }: PageProps) {
  const { courseId } = use(params);
  const router = useRouter();
  const [assessments, setAssessments] = useState<LearnerAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

  async function loadAssessments() {
    try {
      setLoading(true);
      setError(null);
      const data = await assessmentService.getLearnerAssessments(courseId);
      setAssessments(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Không thể tải assessment của khóa học.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssessments();
  }, [courseId]);

  async function handlePrimaryAction(assessment: LearnerAssessment) {
    if (assessment.primaryAction === "VIEW_RESULT" && assessment.latestAttempt?.attemptId) {
      router.push(`/learning/courses/${courseId}/assessments/${assessment.assessmentId}/result/${assessment.latestAttempt.attemptId}`);
      return;
    }

    if (assessment.primaryAction === "CONTINUE" && assessment.latestAttempt?.attemptId) {
      router.push(`/learning/courses/${courseId}/assessments/${assessment.assessmentId}/attempt?attemptId=${assessment.latestAttempt.attemptId}`);
      return;
    }

    if (assessment.primaryAction !== "START") return;

    try {
      setStartingId(assessment.assessmentId);
      const attempt = await assessmentService.startAttempt(assessment.assessmentId);
      router.push(`/learning/courses/${courseId}/assessments/${assessment.assessmentId}/attempt?attemptId=${attempt.attemptId}`);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Không thể bắt đầu assessment.");
    } finally {
      setStartingId(null);
    }
  }

  function getButtonText(assessment: LearnerAssessment) {
    if (startingId === assessment.assessmentId) return "Starting...";
    if (assessment.primaryAction === "START") return "Start";
    if (assessment.primaryAction === "CONTINUE") return "Continue";
    if (assessment.primaryAction === "VIEW_RESULT") return "View result";
    return "Unavailable";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Course assessments</h1>
        <p className="text-sm text-zinc-500">Làm quiz hoặc nộp project trong khóa học.</p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {loading && <p className="text-sm text-zinc-500">Đang tải...</p>}

      {!loading && assessments.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
          Khóa học này chưa có assessment.
        </div>
      )}

      <div className="grid gap-4">
        {assessments.map((assessment) => (
          <div key={assessment.assessmentId} className="rounded-xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <h2 className="text-lg font-semibold">{assessment.title}</h2>
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800">{assessment.type}</span>
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800">{assessment.state}</span>
                </div>
                <p className="line-clamp-2 text-sm text-zinc-500">{assessment.description || "No description"}</p>
                <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                  <span>Total: {assessment.totalPoints} pts</span>
                  <span>Passing: {assessment.passingScore ?? "None"}</span>
                  <span>Attempts: {assessment.attemptsUsed}/{assessment.maxAttempts ?? "∞"}</span>
                  {assessment.timeLimitMinutes && <span>Time: {assessment.timeLimitMinutes} minutes</span>}
                </div>
                {assessment.message && <p className="text-sm text-amber-600">{assessment.message}</p>}
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href={`/learning/courses/${courseId}/assessments/${assessment.assessmentId}`} className="rounded-lg border px-3 py-2 text-sm dark:border-zinc-700">Detail</Link>
                <Link href={`/learning/courses/${courseId}/assessments/${assessment.assessmentId}/history`} className="rounded-lg border px-3 py-2 text-sm dark:border-zinc-700">History</Link>
                <button
                  disabled={assessment.primaryAction === "NONE" || startingId === assessment.assessmentId}
                  onClick={() => handlePrimaryAction(assessment)}
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                >
                  {getButtonText(assessment)}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
