"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Send, XCircle } from "lucide-react";

import CoursePreviewViewer from "@/components/course-preview/CoursePreviewViewer";
import type {
  PreviewCourse,
  PreviewFile,
} from "@/components/course-preview/CoursePreviewViewer";

import {
  instructorCourseService,
  unwrapList,
} from "@/services/instructor-course.service";

import type {
  InstructorCourse,
  Lesson,
  LessonFileMedia,
  Section,
} from "@/services/instructor-course.service";

type SuccessModal = {
  message: string;
  redirectTo?: string;
} | null;

const submittableCourseStatuses = [
  "DRAFT",
  "CHANGES_REQUESTED",
  "REJECTED",
  "NEEDS_CHANGES",
  "NEEDS_REVISION",
  "REVISION_REQUIRED",
];

const lockedSubmitStatuses = [
  "PENDING_REVIEW",
  "SUBMITTED_FOR_REVIEW",
  "IN_REVIEW",
  "UNDER_REVIEW",
  "APPROVED",
  "PUBLISHED",
];

function normalizeCourseStatus(status?: string | null) {
  return String(status || "").toUpperCase();
}

function canSubmitCourse(status?: string | null) {
  const normalizedStatus = normalizeCourseStatus(status);

  if (!normalizedStatus) return true;

  return submittableCourseStatuses.includes(normalizedStatus);
}

function getSubmitLockedMessage(status?: string | null) {
  const normalizedStatus = normalizeCourseStatus(status);

  if (
    normalizedStatus === "PENDING_REVIEW" ||
    normalizedStatus === "SUBMITTED_FOR_REVIEW" ||
    normalizedStatus === "IN_REVIEW" ||
    normalizedStatus === "UNDER_REVIEW"
  ) {
    return "This course is already under review. You cannot submit it again.";
  }

  if (normalizedStatus === "APPROVED" || normalizedStatus === "PUBLISHED") {
    return "This course has already been approved or published. You cannot submit it again.";
  }

  if (lockedSubmitStatuses.includes(normalizedStatus)) {
    return "This course cannot be submitted in its current status.";
  }

  if (normalizedStatus && !submittableCourseStatuses.includes(normalizedStatus)) {
    return `This course cannot be submitted in its current status: ${normalizedStatus}.`;
  }

  return "";
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

  if (err instanceof Error) {
    return err.message;
  }

  return fallback;
}

function normalizeFileMedia(file: any): PreviewFile | null {
  const url =
    file?.url ??
    file?.fileUrl ??
    file?.mediaUrl ??
    file?.secureUrl ??
    file?.resourceUrl ??
    "";

  if (!url) return null;

  return {
    id: file.id ?? file.fileMediaId ?? file.mediaId ?? url,
    url,
    type: file.type ?? file.mediaType ?? file.resourceType ?? "OTHER",
    filename:
      file.filename ??
      file.fileName ??
      file.originalFilename ??
      file.originalName ??
      file.name ??
      null,
    mimeType: file.mimeType ?? file.mimetype ?? file.contentType ?? null,
    sizeInBytes: file.sizeInBytes ?? file.size ?? file.bytes ?? null,
  };
}

function normalizeFileMediaList(rawFiles: any): PreviewFile[] {
  if (!Array.isArray(rawFiles)) return [];

  return rawFiles
    .map((file) => normalizeFileMedia(file))
    .filter(Boolean) as PreviewFile[];
}

function normalizeInstructorCourse(
  course: InstructorCourse,
  sections: Section[]
): PreviewCourse {
  return {
    id: course.id,
    title: course.title,
    shortDescription: course.shortDescription ?? null,
    description: course.description ?? null,
    thumbnailUrl: course.thumbnailUrl ?? null,
    level: course.level ?? null,
    language: course.language ?? null,
    certificateEnabled: Boolean(course.certificateEnabled),
    status: course.status ?? null,
    sections: sections.map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description ?? null,
      isActive: section.isActive,
      lessons: (section.lessons ?? []).map((lesson: any) => {
        const rawFiles =
          lesson.files ??
          lesson.fileMedias ??
          lesson.lessonFiles ??
          lesson.media ??
          lesson.medias ??
          lesson.resources ??
          [];

        return {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description ?? null,
          isActive: lesson.isActive,
          files: normalizeFileMediaList(rawFiles),
        };
      }),
    })),
  };
}

export default function InstructorCoursePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = String(params.id);

  const [course, setCourse] = useState<PreviewCourse | null>(null);
  const [loading, setLoading] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  const [showSubmitReviewModal, setShowSubmitReviewModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState<string | null>(
    null
  );
  const [successModal, setSuccessModal] = useState<SuccessModal>(null);

  const submitAllowed = useMemo(() => {
    return canSubmitCourse(course?.status);
  }, [course?.status]);

  const submitLockedMessage = useMemo(() => {
    return getSubmitLockedMessage(course?.status);
  }, [course?.status]);

  function showError(message: string) {
    setSuccessModal(null);
    setErrorModalMessage(message);
  }

  function showSuccess(message: string, redirectTo?: string) {
    setErrorModalMessage(null);
    setSuccessModal({
      message,
      redirectTo,
    });
  }

  function closeSuccessModal() {
    const redirectTo = successModal?.redirectTo;

    setSuccessModal(null);

    if (redirectTo) {
      router.replace(redirectTo);
    }
  }

  function ensureCanSubmitCourse() {
    if (submitAllowed) return true;

    showError(
      submitLockedMessage ||
        "This course cannot be submitted in its current status."
    );

    return false;
  }

  async function fetchLessonFiles(sectionId: string, lessonId: string) {
    try {
      const response = await instructorCourseService.getLessonFiles(
        courseId,
        sectionId,
        lessonId,
        {
          page: 1,
          limit: 100,
          sortField: "createdAt",
          sortDirection: "desc",
        }
      );

      return unwrapList<LessonFileMedia>(response);
    } catch {
      return [];
    }
  }

  async function fetchPreviewCourse() {
    try {
      setLoading(true);
      setErrorModalMessage(null);

      const courseResponse = await instructorCourseService.getMyCourses({
        page: 1,
        limit: 100,
      });

      const courseList = unwrapList<InstructorCourse>(courseResponse);
      const currentCourse = courseList.find((item) => item.id === courseId);

      if (!currentCourse) {
        throw new Error("Course not found.");
      }

      const sectionResponse = await instructorCourseService.getSections(
        courseId,
        {
          sortField: "sectionIndex",
          sortDirection: "asc",
          limit: 100,
        }
      );

      const sectionList = unwrapList<Section>(sectionResponse);

      const sectionsWithLessons = await Promise.all(
        sectionList.map(async (section) => {
          try {
            const lessonResponse = await instructorCourseService.getLessons(
              courseId,
              section.id,
              {
                sortField: "lessonIndex",
                sortDirection: "asc",
                limit: 100,
              }
            );

            const lessons = unwrapList<Lesson>(lessonResponse);

            const lessonsWithFiles = await Promise.all(
              lessons.map(async (lesson) => {
                const files = await fetchLessonFiles(section.id, lesson.id);

                return {
                  ...lesson,
                  files,
                };
              })
            );

            return {
              ...section,
              lessons: lessonsWithFiles,
            };
          } catch {
            return {
              ...section,
              lessons: section.lessons ?? [],
            };
          }
        })
      );

      setCourse(normalizeInstructorCourse(currentCourse, sectionsWithLessons));
    } catch (err) {
      showError(getErrorMessage(err, "Failed to load course preview."));
    } finally {
      setLoading(false);
    }
  }

  function handleSubmitForReview() {
    if (!ensureCanSubmitCourse()) return;

    setShowSubmitReviewModal(true);
  }

  async function confirmSubmitForReview() {
    if (!ensureCanSubmitCourse()) {
      setShowSubmitReviewModal(false);
      return;
    }

    try {
      setSubmittingReview(true);
      setErrorModalMessage(null);
      setSuccessModal(null);

      await instructorCourseService.submitForReview(courseId);

      setShowSubmitReviewModal(false);
      showSuccess(
        "Course submitted for review successfully.",
        "/instructor/courses"
      );
    } catch (err) {
      showError(getErrorMessage(err, "Failed to submit for review."));
    } finally {
      setSubmittingReview(false);
    }
  }

  useEffect(() => {
    fetchPreviewCourse();
  }, [courseId]);

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-zinc-500">Loading course preview...</p>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="space-y-4">
        <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-zinc-500">
          Course preview not found.
        </div>

        <button
          type="button"
          onClick={() => router.push(`/instructor/courses/${courseId}/edit`)}
          className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
        >
          Back to Edit
        </button>

        {errorModalMessage && (
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
                    {errorModalMessage}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setErrorModalMessage(null)}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Close
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
        backLabel="Back to Edit Course"
        onBack={() => router.push(`/instructor/courses/${courseId}/edit`)}
        rightAction={
          submitAllowed ? (
            <button
              type="button"
              onClick={handleSubmitForReview}
              disabled={submittingReview}
              title="Submit course for review"
              className="inline-flex items-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="mr-2 h-4 w-4" />
              {submittingReview ? "Submitting..." : "Submit for Review"}
            </button>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">
              {submitLockedMessage ||
                "This course cannot be submitted in its current status."}
            </div>
          )
        }
      />

      {showSubmitReviewModal && submitAllowed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-zinc-900">
              Submit course for review?
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              After submitting, this course will be sent to reviewers. You may
              not be able to edit it while it is under review.
            </p>

            <div className="mt-4 rounded-lg border bg-zinc-50 p-3 text-sm">
              <p className="font-medium text-zinc-900">
                {course.title || "Untitled course"}
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Status: {course.status || "DRAFT"}
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Lessons:{" "}
                {course.sections?.reduce(
                  (total, section) => total + (section.lessons?.length ?? 0),
                  0
                ) ?? 0}
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSubmitReviewModal(false)}
                disabled={submittingReview}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmSubmitForReview}
                disabled={submittingReview || !submitAllowed}
                className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="mr-2 h-4 w-4" />
                {submittingReview ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {errorModalMessage && (
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
                  {errorModalMessage}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setErrorModalMessage(null)}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {successModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  Success
                </h2>

                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600">
                  {successModal.message}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={closeSuccessModal}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}