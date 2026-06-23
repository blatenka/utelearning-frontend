"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Send } from "lucide-react";

import CoursePreviewViewer from "@/components/course-preview/CoursePreviewViewer";
import type { PreviewCourse } from "@/components/course-preview/CoursePreviewViewer";

import {
  instructorCourseService,
  unwrapList,
} from "@/services/instructor-course.service";

import type {
  InstructorCourse,
  Section,
} from "@/services/instructor-course.service";

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
    sections: sections.map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description ?? null,
      isActive: section.isActive,
      lessons: (section.lessons ?? []).map((lesson: any) => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description ?? null,
        isActive: lesson.isActive,
        files:
          lesson.files ??
          lesson.fileMedias ??
          lesson.media ??
          lesson.lessonFiles ??
          [],
      })),
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
  const [error, setError] = useState("");

  async function fetchPreviewCourse() {
    try {
      setLoading(true);
      setError("");

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

            return {
              ...section,
              lessons: unwrapList<any>(lessonResponse),
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
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load course preview."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitForReview() {
    const confirmed = window.confirm(
      "Submit this course for review? You may not be able to edit it after submitting."
    );

    if (!confirmed) return;

    try {
      setSubmittingReview(true);
      setError("");

      await instructorCourseService.submitForReview(courseId);

      router.replace("/instructor/courses");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to submit for review.");
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

  if (error) {
    return (
      <main className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {Array.isArray(error) ? error.join(", ") : error}
        </div>

        <button
          type="button"
          onClick={() => router.push(`/instructor/courses/${courseId}/edit`)}
          className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
        >
          Back to Edit
        </button>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-zinc-500">Course preview not found.</p>
      </main>
    );
  }

  return (
    <CoursePreviewViewer
      course={course}
      backLabel="Back to Edit Course"
      onBack={() => router.push(`/instructor/courses/${courseId}/edit`)}
      rightAction={
        <button
          type="button"
          onClick={handleSubmitForReview}
          disabled={submittingReview}
          className="inline-flex items-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send className="mr-2 h-4 w-4" />
          {submittingReview ? "Submitting..." : "Submit for Review"}
        </button>
      }
    />
  );
}