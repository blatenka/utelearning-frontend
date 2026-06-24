"use client";

import { useMemo, useState } from "react";
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

export type PreviewFile = {
  id?: string;
  url: string;
  type?: "IMAGE" | "VIDEO" | "RAW" | string;
  filename?: string | null;
  mimeType?: string | null;
};

export type PreviewLesson = {
  id: string;
  title: string;
  description?: string | null;
  isActive?: boolean;
  files?: PreviewFile[];
};

export type PreviewSection = {
  id: string;
  title: string;
  description?: string | null;
  isActive?: boolean;
  lessons?: PreviewLesson[];
};

export type PreviewCourse = {
  id: string;
  title: string;
  shortDescription?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  level?: string | null;
  language?: string | null;
  certificateEnabled?: boolean;
  sections?: PreviewSection[];
};

type FlatLesson = {
  sectionId: string;
  sectionTitle: string;
  sectionIndex: number;
  lesson: PreviewLesson;
  lessonIndex: number;
};

function flattenLessons(course: PreviewCourse | null): FlatLesson[] {
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

function isYoutubeUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.replace("www.", "");

    return (
      hostname === "youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "youtu.be" ||
      hostname === "youtube-nocookie.com"
    );
  } catch {
    return false;
  }
}

function getYoutubeEmbedUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.replace("www.", "");

    let videoId = "";

    if (hostname === "youtu.be") {
      videoId = parsedUrl.pathname.replace("/", "");
    }

    if (
      hostname === "youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "youtube-nocookie.com"
    ) {
      if (parsedUrl.pathname === "/watch") {
        videoId = parsedUrl.searchParams.get("v") || "";
      }

      if (parsedUrl.pathname.startsWith("/embed/")) {
        videoId = parsedUrl.pathname.replace("/embed/", "");
      }

      if (parsedUrl.pathname.startsWith("/shorts/")) {
        videoId = parsedUrl.pathname.replace("/shorts/", "");
      }
    }

    if (!videoId) return null;

    const start = parsedUrl.searchParams.get("start") || parsedUrl.searchParams.get("t");

    let startSeconds = "";

    if (start) {
      const match = start.match(/^(\d+)s?$/);
      if (match) startSeconds = match[1];
    }

    const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);

    if (startSeconds) {
      embedUrl.searchParams.set("start", startSeconds);
    }

    return embedUrl.toString();
  } catch {
    return null;
  }
}

function getPrimaryFile(lesson: PreviewLesson | null) {
  if (!lesson?.files?.length) return null;

  const youtubeVideo = lesson.files.find(
    (file) => file.type === "VIDEO" && isYoutubeUrl(file.url)
  );
  if (youtubeVideo) return youtubeVideo;

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

function renderLearningFile(file: PreviewFile | null) {
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
          This lesson does not have video, image, or document files yet.
        </p>
      </div>
    );
  }

  if (file.type === "VIDEO") {
    const youtubeEmbedUrl = getYoutubeEmbedUrl(file.url);

    if (youtubeEmbedUrl) {
      return (
        <div className="overflow-hidden rounded-2xl border bg-black shadow-sm">
          <iframe
            src={youtubeEmbedUrl}
            title={file.filename || "YouTube video"}
            className="aspect-video w-full bg-black"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-2xl border bg-black shadow-sm">
        <video src={file.url} controls className="aspect-video w-full bg-black" />
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

function getFileTypeLabel(file: PreviewFile | null) {
  if (!file) return "No media";
  if (file.type === "VIDEO" && isYoutubeUrl(file.url)) return "YOUTUBE";
  return file.type || "FILE";
}

function LessonSidebar({
  sections,
  selectedLessonId,
  onSelectLesson,
}: {
  sections: PreviewSection[];
  selectedLessonId?: string;
  onSelectLesson: (lesson: PreviewLesson) => void;
}) {
  return (
    <aside className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <ListVideo className="h-5 w-5 text-zinc-500" />
          <h2 className="font-semibold text-zinc-950">Course Content</h2>
        </div>

        <p className="mt-1 text-sm text-zinc-500">
          Select a lesson to preview.
        </p>
      </div>

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
                        active ? "bg-zinc-900 text-white" : "hover:bg-zinc-50"
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
                              <span>{getFileTypeLabel(primaryFile)}</span>
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
    </aside>
  );
}

export default function CoursePreviewViewer({
  course,
  backLabel,
  onBack,
  rightAction,
}: {
  course: PreviewCourse;
  backLabel: string;
  onBack: () => void;
  rightAction?: React.ReactNode;
}) {
  const flatLessons = useMemo(() => flattenLessons(course), [course]);

  const [selectedLesson, setSelectedLesson] = useState<PreviewLesson | null>(
    flatLessons[0]?.lesson ?? null
  );

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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-fit items-center rounded-full border bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {backLabel}
        </button>

        {rightAction}
      </div>

      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="aspect-video w-full object-cover"
          />
        ) : (
          <div className="flex aspect-video items-center justify-center bg-zinc-900 text-white">
            <BookOpen className="mr-2 h-6 w-6" />
            Course Preview
          </div>
        )}

        <div className="space-y-4 p-6">
          <div className="flex flex-wrap gap-2">
            {course.level && (
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                {course.level}
              </span>
            )}

            {course.language && (
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                {course.language}
              </span>
            )}

            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              Preview mode
            </span>
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-950">
              {course.title}
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
              {course.shortDescription || "Preview this course before publish."}
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
            <span>{flatLessons.length} lessons</span>

            {course.certificateEnabled && (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Certificate included
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-indigo-600">
              {currentFlatLesson
                ? `Section ${currentFlatLesson.sectionIndex + 1}: ${currentFlatLesson.sectionTitle}`
                : "Current lesson"}
            </p>

            <h2 className="mt-1 text-2xl font-bold text-zinc-950">
              {selectedLesson?.title || "No lesson selected"}
            </h2>

            {currentFlatLesson && (
              <p className="mt-2 text-sm text-zinc-500">
                Lesson {currentFlatLesson.lessonIndex + 1} of section •{" "}
                {currentLessonIndex + 1}/{flatLessons.length} total lessons
              </p>
            )}
          </div>

          {selectedFile && (
            <span className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700">
              {renderFileIcon(selectedFile.type)}
              {getFileTypeLabel(selectedFile)}
            </span>
          )}
        </div>

        <div className="mt-6">{renderLearningFile(selectedFile)}</div>

        <div className="mt-6 rounded-2xl bg-zinc-50 p-5">
          <h3 className="font-semibold text-zinc-950">Lesson Description</h3>

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
        sections={course.sections ?? []}
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
                  key={file.id || file.url}
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
                    {getFileTypeLabel(file)}
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}