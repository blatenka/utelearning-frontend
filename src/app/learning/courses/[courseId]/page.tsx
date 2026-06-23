"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  ImageIcon,
  ListVideo,
  LockKeyhole,
  PlayCircle,
} from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";
import { learningService, unwrapData } from "@/services/learning.service";

import type {
  CourseLearningDetail,
  LearningFile,
  LearningLesson,
  LearningSection,
} from "@/services/learning.service";

type FlatLesson = {
  sectionId: string;
  sectionTitle: string;
  sectionIndex: number;
  lesson: LearningLesson;
  lessonIndex: number;
};

function flattenLessons(course: CourseLearningDetail | null): FlatLesson[] {
  if (!course?.sections?.length) return [];

  return course.sections.flatMap((section, sectionIndex) =>
    (section.lessons ?? []).map((lesson, lessonIndex) => ({
      sectionId: section.id,
      sectionTitle: section.title,
      sectionIndex,
      lesson,
      lessonIndex,
    }))
  );
}

function getPrimaryFile(lesson: LearningLesson | null) {
  if (!lesson?.files?.length) return null;

  const video = lesson.files.find((file) => file.type === "VIDEO");
  if (video) return video;

  const image = lesson.files.find((file) => file.type === "IMAGE");
  if (image) return image;

  return lesson.files[0];
}

function renderFileIcon(type?: string) {
  if (type === "VIDEO") return <PlayCircle className="h-4 w-4" />;
  if (type === "IMAGE") return <ImageIcon className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

function renderLearningFile(file: LearningFile | null) {
  if (!file) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100">
          <BookOpen className="h-8 w-8 text-zinc-400" />
        </div>

        <h2 className="mt-5 text-xl font-semibold text-zinc-900">
          No media available
        </h2>

        <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
          This lesson does not have video, image, or document files yet. You can
          still read the lesson description below.
        </p>
      </div>
    );
  }

  if (file.type === "VIDEO") {
    return (
      <div className="overflow-hidden rounded-2xl border bg-black shadow-sm">
        <video
          src={file.url}
          controls
          className="aspect-video w-full bg-black"
        />
      </div>
    );
  }

  if (file.type === "IMAGE") {
    return (
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <img
          src={file.url}
          alt={file.filename || "Lesson image"}
          className="max-h-[520px] w-full rounded-xl object-contain"
        />
      </div>
    );
  }

  const isPdf =
    file.mimeType?.includes("pdf") ||
    file.filename?.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    return (
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <iframe
          src={file.url}
          className="h-[620px] w-full bg-white"
          title={file.filename || "PDF document"}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border bg-white p-8 text-center shadow-sm">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100">
        <FileText className="h-8 w-8 text-zinc-400" />
      </div>

      <h2 className="mt-5 text-lg font-semibold text-zinc-900">
        {file.filename || "Attached file"}
      </h2>

      <p className="mt-2 text-sm text-zinc-500">
        This file cannot be previewed directly.
      </p>

      <a
        href={file.url}
        target="_blank"
        rel="noreferrer"
        className="mt-5 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700"
      >
        Open file
      </a>
    </div>
  );
}

function LessonSidebar({
  sections,
  selectedLessonId,
  onSelectLesson,
}: {
  sections: LearningSection[];
  selectedLessonId?: string;
  onSelectLesson: (lesson: LearningLesson) => void;
}) {
  return (
    <aside className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <ListVideo className="h-5 w-5 text-zinc-500" />
          <h2 className="font-semibold text-zinc-950">Course Content</h2>
        </div>

        <p className="mt-1 text-sm text-zinc-500">
          Select a lesson to continue learning.
        </p>
      </div>

      <div>
        {sections.length ? (
          sections.map((section, sectionIndex) => (
            <details
              key={section.id}
              open={sectionIndex === 0}
              className="border-b last:border-b-0"
            >
              <summary className="cursor-pointer bg-zinc-50 px-5 py-4 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100">
                Section {sectionIndex + 1}: {section.title}
              </summary>

              <div className="bg-white">
                {section.lessons?.length ? (
                  section.lessons.map((lesson, lessonIndex) => {
                    const active = selectedLessonId === lesson.id;
                    const primaryFile = getPrimaryFile(lesson);

                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => onSelectLesson(lesson)}
                        className={`flex w-full gap-3 border-t px-5 py-4 text-left transition ${
                          active
                            ? "bg-zinc-900 text-white"
                            : "hover:bg-zinc-50"
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                            active
                              ? "bg-white text-zinc-900"
                              : "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {lessonIndex + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-medium">
                            {lesson.title}
                          </p>

                          <div
                            className={`mt-2 flex items-center gap-2 text-xs ${
                              active ? "text-zinc-200" : "text-zinc-500"
                            }`}
                          >
                            {primaryFile ? (
                              <>
                                {renderFileIcon(primaryFile.type)}
                                <span>{primaryFile.type}</span>
                              </>
                            ) : (
                              <>
                                <LockKeyhole className="h-4 w-4" />
                                <span>No media</span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="flex items-center gap-2 px-5 py-4 text-sm text-zinc-500">
                    <LockKeyhole className="h-4 w-4" />
                    No lessons
                  </div>
                )}
              </div>
            </details>
          ))
        ) : (
          <div className="px-5 py-10 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-zinc-300" />
            <p className="mt-3 text-sm text-zinc-500">
              No learning content available.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

export default function LearningCoursePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const courseId = String(params.courseId);

  const [course, setCourse] = useState<CourseLearningDetail | null>(null);
  const [selectedLesson, setSelectedLesson] =
    useState<LearningLesson | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const flatLessons = useMemo(() => flattenLessons(course), [course]);

  const currentLessonIndex = useMemo(() => {
    if (!selectedLesson) return -1;
    return flatLessons.findIndex((item) => item.lesson.id === selectedLesson.id);
  }, [flatLessons, selectedLesson]);

  const currentFlatLesson = useMemo(() => {
    if (currentLessonIndex < 0) return null;
    return flatLessons[currentLessonIndex] ?? null;
  }, [flatLessons, currentLessonIndex]);

  const previousLesson = useMemo(() => {
    if (currentLessonIndex <= 0) return null;
    return flatLessons[currentLessonIndex - 1]?.lesson ?? null;
  }, [flatLessons, currentLessonIndex]);

  const nextLesson = useMemo(() => {
    if (currentLessonIndex < 0) return null;
    return flatLessons[currentLessonIndex + 1]?.lesson ?? null;
  }, [flatLessons, currentLessonIndex]);

  const selectedFile = useMemo(() => {
    return getPrimaryFile(selectedLesson);
  }, [selectedLesson]);

  const totalLessons = flatLessons.length;

  async function fetchLearningCourse() {
    try {
      setLoading(true);
      setError("");

      const response = await learningService.getCourseLearningDetail(courseId);
      const payload = unwrapData<CourseLearningDetail>(response);

      const lessons = flattenLessons(payload);

      setCourse(payload);
      setSelectedLesson(lessons[0]?.lesson ?? null);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load learning content."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace(
        `/auth?tab=login&redirect=${encodeURIComponent(
          `/learning/courses/${courseId}`
        )}`
      );
      return;
    }

    fetchLearningCourse();
  }, [authLoading, user, courseId]);

  if (authLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-zinc-500">Checking authentication...</p>
      </main>
    );
  }

  return (
    <div className="space-y-8">
      <button
        type="button"
        onClick={() => router.push("/my-learning")}
        className="inline-flex items-center rounded-full border bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to My Learning
      </button>

      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        {course?.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="aspect-video w-full object-cover"
          />
        ) : (
          <div className="flex aspect-video items-center justify-center bg-zinc-900 text-white">
            <BookOpen className="mr-2 h-6 w-6" />
            Learning Course
          </div>
        )}

        <div className="space-y-4 p-6">
          <div className="flex flex-wrap gap-2">
            {course?.level && (
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                {course.level}
              </span>
            )}

            {course?.language && (
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                {course.language}
              </span>
            )}

            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              Enrolled
            </span>
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-950">
              {course?.title || "Learning Course"}
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
              {course?.shortDescription || "Continue learning this course."}
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
            <span>{totalLessons} lessons</span>

            {course?.certificateEnabled && (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Certificate included
              </span>
            )}
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {Array.isArray(error) ? error.join(", ") : error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[360px] items-center justify-center rounded-2xl border bg-white shadow-sm">
          <p className="text-sm text-zinc-500">Loading learning content...</p>
        </div>
      ) : (
        <>
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-indigo-600">
                  {currentFlatLesson
                    ? `Section ${currentFlatLesson.sectionIndex + 1}: ${
                        currentFlatLesson.sectionTitle
                      }`
                    : "Current lesson"}
                </p>

                <h2 className="mt-1 text-2xl font-bold text-zinc-950">
                  {selectedLesson?.title || "No lesson selected"}
                </h2>

                {currentFlatLesson && (
                  <p className="mt-2 text-sm text-zinc-500">
                    Lesson {currentFlatLesson.lessonIndex + 1} of section •{" "}
                    {currentLessonIndex + 1}/{totalLessons} total lessons
                  </p>
                )}
              </div>

              {selectedFile && (
                <span className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700">
                  {renderFileIcon(selectedFile.type)}
                  {selectedFile.type}
                </span>
              )}
            </div>

            <div className="mt-6">{renderLearningFile(selectedFile)}</div>

            <div className="mt-6 rounded-2xl bg-zinc-50 p-5">
              <h3 className="font-semibold text-zinc-950">
                Lesson Description
              </h3>

              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-600">
                {selectedLesson?.description || "No lesson description."}
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                disabled={!previousLesson}
                onClick={() => {
                  if (previousLesson) setSelectedLesson(previousLesson);
                }}
                className="inline-flex items-center justify-center rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous Lesson
              </button>

              <button
                type="button"
                disabled={!nextLesson}
                onClick={() => {
                  if (nextLesson) setSelectedLesson(nextLesson);
                }}
                className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next Lesson
                <ChevronRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </section>

          <LessonSidebar
            sections={course?.sections ?? []}
            selectedLessonId={selectedLesson?.id}
            onSelectLesson={setSelectedLesson}
          />

          {selectedLesson?.files?.length ? (
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-zinc-950">
                Lesson Resources
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                Files and documents attached to this lesson.
              </p>

              <div className="mt-4 grid gap-3">
                {selectedLesson.files.map((file) => {
                  const active = selectedFile?.id === file.id;

                  return (
                    <a
                      key={file.id}
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
                        active
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "bg-zinc-50 hover:bg-zinc-100"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {renderFileIcon(file.type)}

                        <span className="truncate font-medium">
                          {file.filename || "Lesson file"}
                        </span>
                      </div>

                      <span
                        className={`ml-3 shrink-0 text-xs ${
                          active ? "text-zinc-200" : "text-zinc-500"
                        }`}
                      >
                        {file.type}
                      </span>
                    </a>
                  );
                })}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}