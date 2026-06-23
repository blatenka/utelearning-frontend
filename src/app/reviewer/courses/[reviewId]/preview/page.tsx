"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";

import CoursePreviewViewer from "@/components/course-preview/CoursePreviewViewer";
import type { PreviewCourse } from "@/components/course-preview/CoursePreviewViewer";

import {
  reviewerCourseService,
  unwrapData,
} from "@/services/review.service";

function normalizeReviewerWorkspace(payload: any): PreviewCourse {
  const rawCourse = payload.course ?? payload;

  const rawSections =
    rawCourse.sections ??
    rawCourse.courseSections ??
    payload.sections ??
    payload.courseSections ??
    [];

  return {
    id: rawCourse.id ?? rawCourse.courseId,
    title: rawCourse.title ?? "Untitled course",
    shortDescription: rawCourse.shortDescription ?? null,
    description: rawCourse.description ?? null,
    thumbnailUrl: rawCourse.thumbnailUrl ?? null,
    level: rawCourse.level ?? null,
    language: rawCourse.language ?? null,
    certificateEnabled: Boolean(rawCourse.certificateEnabled),
    sections: rawSections.map((section: any) => {
      const rawLessons =
        section.lessons ??
        section.courseLessons ??
        section.lessonItems ??
        [];

      return {
        id: section.id,
        title: section.title,
        description: section.description ?? null,
        isActive: section.isActive,
        lessons: rawLessons.map((lesson: any) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description ?? null,
          isActive: lesson.isActive,
          files:
            lesson.files ??
            lesson.fileMedias ??
            lesson.lessonFiles ??
            lesson.media ??
            [],
        })),
      };
    }),
  };
}

export default function ReviewerCoursePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const reviewId = String(params.reviewId);

  const [course, setCourse] = useState<PreviewCourse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchReviewerPreview() {
    if (!reviewId || reviewId === "undefined") {
      setError("Invalid review task id.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await reviewerCourseService.getReviewWorkspace(reviewId);
      const payload = unwrapData<any>(response);

      setCourse(normalizeReviewerWorkspace(payload));
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message;

      if (message === "REVIEW_TASK_NOT_FOUND") {
        setError(
          "This review task is no longer available or has already been completed."
        );

        setTimeout(() => {
          router.replace("/reviewer/courses");
        }, 1200);

        return;
      }

      setError(message || "Failed to load reviewer course preview.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReviewerPreview();
  }, [reviewId]);

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-zinc-500">Loading reviewer preview...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {Array.isArray(error) ? error.join(", ") : error}
        </div>

        <button
          type="button"
          onClick={() => router.push("/reviewer/courses")}
          className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
        >
          Back to My Review Tasks
        </button>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-zinc-500">Preview not found.</p>
      </main>
    );
  }

  return (
    <CoursePreviewViewer
      course={course}
      backLabel="Back to Review Workspace"
      onBack={() => router.push(`/reviewer/courses/${reviewId}`)}
      rightAction={
        <button
          type="button"
          onClick={() => router.push(`/reviewer/courses/${reviewId}`)}
          className="inline-flex items-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700"
        >
          <ClipboardCheck className="mr-2 h-4 w-4" />
          Go to Decision
        </button>
      }
    />
  );
}