"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ClipboardCheck, XCircle } from "lucide-react";

import CoursePreviewViewer from "@/components/course-preview/CoursePreviewViewer";
import type { PreviewCourse } from "@/components/course-preview/CoursePreviewViewer";

import { reviewerCourseService, unwrapData } from "@/services/review.service";

type ErrorModal = {
  message: string;
  redirectTo?: string;
} | null;

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
  const [errorModal, setErrorModal] = useState<ErrorModal>(null);

  function showError(message: string, redirectTo?: string) {
    setErrorModal({
      message,
      redirectTo,
    });
  }

  function closeErrorModal() {
    const redirectTo = errorModal?.redirectTo;

    setErrorModal(null);

    if (redirectTo) {
      router.replace(redirectTo);
    }
  }

  async function fetchReviewerPreview() {
    if (!reviewId || reviewId === "undefined") {
      showError("Invalid review task id.", "/reviewer/courses");
      return;
    }

    try {
      setLoading(true);
      setErrorModal(null);

      const response = await reviewerCourseService.getReviewWorkspace(reviewId);
      const payload = unwrapData<any>(response);

      setCourse(normalizeReviewerWorkspace(payload));
    } catch (err) {
      const message = getErrorMessage(
        err,
        "Failed to load reviewer course preview."
      );

      if (message === "REVIEW_TASK_NOT_FOUND") {
        showError(
          "This review task is no longer available or has already been completed.",
          "/reviewer/courses"
        );
        return;
      }

      showError(message || "Failed to load reviewer course preview.");
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

  if (!course) {
    return (
      <main className="space-y-4">
        <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-zinc-500">
          Preview not found.
        </div>

        <button
          type="button"
          onClick={() => router.push("/reviewer/courses")}
          className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
        >
          Back to My Review Tasks
        </button>

        {errorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <XCircle className="h-5 w-5 text-red-700" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">
                    Something went wrong
                  </h2>

                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600">
                    {errorModal.message}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={closeErrorModal}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                >
                  {errorModal.redirectTo ? "Back to My Review Tasks" : "Close"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <>
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

      {errorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-5 w-5 text-red-700" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  Something went wrong
                </h2>

                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600">
                  {errorModal.message}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={closeErrorModal}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                {errorModal.redirectTo ? "Back to My Review Tasks" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}