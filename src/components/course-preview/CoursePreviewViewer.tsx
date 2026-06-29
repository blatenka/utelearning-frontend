"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  ImageIcon,
  ListVideo,
  LockKeyhole,
  Music,
  PlayCircle,
} from "lucide-react";

export type PreviewFile = {
  id?: string;
  url: string;
  type?: "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO" | "OTHER" | "RAW" | string;
  filename?: string | null;
  mimeType?: string | null;
  sizeInBytes?: number | null;
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
  status?: string | null;
  sections?: PreviewSection[];
};

type NormalizedMediaType =
  | "IMAGE"
  | "VIDEO"
  | "DOCUMENT"
  | "AUDIO"
  | "OTHER"
  | "YOUTUBE";

type CourseSummary = {
  sectionCount: number;
  lessonCount: number;
  mediaCount: number;
};

const submittableCourseStatuses = [
  "DRAFT",
  "CHANGES_REQUESTED",
  "REJECTED",
  "NEEDS_CHANGES",
  "NEEDS_REVISION",
  "REVISION_REQUIRED",
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

  if (normalizedStatus) {
    return `This course cannot be submitted in its current status: ${normalizedStatus}.`;
  }

  return "";
}

function getCourseSummary(course: PreviewCourse): CourseSummary {
  const sections = course.sections ?? [];

  const lessonCount = sections.reduce(
    (total, section) => total + (section.lessons?.length ?? 0),
    0
  );

  const mediaCount = sections.reduce((sectionTotal, section) => {
    return (
      sectionTotal +
      (section.lessons ?? []).reduce(
        (lessonTotal, lesson) => lessonTotal + (lesson.files?.length ?? 0),
        0
      )
    );
  }, 0);

  return {
    sectionCount: sections.length,
    lessonCount,
    mediaCount,
  };
}

function isYoutubeUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.replace("www.", "").toLowerCase();

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
    const hostname = parsedUrl.hostname.replace("www.", "").toLowerCase();

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

    videoId = videoId.split("?")[0].split("&")[0].trim();

    if (!videoId) return null;

    const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);

    const start =
      parsedUrl.searchParams.get("start") || parsedUrl.searchParams.get("t");

    if (start) {
      const match = start.match(/^(\d+)s?$/);

      if (match) {
        embedUrl.searchParams.set("start", match[1]);
      }
    }

    return embedUrl.toString();
  } catch {
    return null;
  }
}

function normalizeMediaType(file: PreviewFile): NormalizedMediaType {
  const rawType = String(file.type || "").toUpperCase();
  const url = file.url.toLowerCase().split("?")[0];
  const mimeType = file.mimeType?.toLowerCase() || "";
  const filename = file.filename?.toLowerCase() || "";

  if (isYoutubeUrl(file.url)) return "YOUTUBE";

  if (
    rawType === "IMAGE" ||
    mimeType.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/.test(url) ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/.test(filename)
  ) {
    return "IMAGE";
  }

  if (
    rawType === "VIDEO" ||
    mimeType.startsWith("video/") ||
    /\.(mp4|mov|webm|mkv|avi)$/.test(url) ||
    /\.(mp4|mov|webm|mkv|avi)$/.test(filename)
  ) {
    return "VIDEO";
  }

  if (
    rawType === "AUDIO" ||
    mimeType.startsWith("audio/") ||
    /\.(mp3|wav|ogg|m4a|aac)$/.test(url) ||
    /\.(mp3|wav|ogg|m4a|aac)$/.test(filename)
  ) {
    return "AUDIO";
  }

  if (
    rawType === "DOCUMENT" ||
    rawType === "RAW" ||
    mimeType.includes("pdf") ||
    mimeType.includes("officedocument") ||
    mimeType.includes("msword") ||
    mimeType.includes("ms-excel") ||
    mimeType.includes("ms-powerpoint") ||
    /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|csv)$/.test(url) ||
    /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|csv)$/.test(filename)
  ) {
    return "DOCUMENT";
  }

  return "OTHER";
}

function renderFileIcon(type: NormalizedMediaType) {
  if (type === "VIDEO" || type === "YOUTUBE") {
    return <PlayCircle className="h-4 w-4" />;
  }

  if (type === "IMAGE") {
    return <ImageIcon className="h-4 w-4" />;
  }

  if (type === "AUDIO") {
    return <Music className="h-4 w-4" />;
  }

  return <FileText className="h-4 w-4" />;
}

function formatFileSize(size?: number | null) {
  if (size === undefined || size === null) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function isPdfFile(file: PreviewFile) {
  const type = normalizeMediaType(file);
  const url = file.url.toLowerCase().split("?")[0];
  const filename = file.filename?.toLowerCase() || "";
  const mimeType = file.mimeType?.toLowerCase() || "";

  return (
    type === "DOCUMENT" &&
    (mimeType.includes("pdf") ||
      filename.endsWith(".pdf") ||
      url.endsWith(".pdf"))
  );
}

function MediaTypePill({ file }: { file: PreviewFile }) {
  const type = normalizeMediaType(file);

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
      {renderFileIcon(type)}
      {type}
    </span>
  );
}

function renderLearningFile(file: PreviewFile) {
  const type = normalizeMediaType(file);

  if (type === "YOUTUBE") {
    const youtubeEmbedUrl = getYoutubeEmbedUrl(file.url);

    if (youtubeEmbedUrl) {
      return (
        <div className="w-full overflow-hidden rounded-xl border bg-black">
          <iframe
            src={youtubeEmbedUrl}
            title={file.filename || "YouTube video"}
            className="aspect-video w-full max-w-full bg-black"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    }
  }

  if (type === "VIDEO") {
    return (
      <div className="w-full overflow-hidden rounded-xl border bg-black">
        <video
          src={file.url}
          controls
          className="aspect-video w-full max-w-full bg-black"
        />
      </div>
    );
  }

  if (type === "IMAGE") {
    return (
      <div className="w-full overflow-hidden rounded-xl border bg-white p-3">
        <img
          src={file.url}
          alt={file.filename || "Lesson image"}
          className="max-h-[420px] w-full max-w-full rounded-lg object-contain"
        />
      </div>
    );
  }

  if (type === "AUDIO") {
    return (
      <div className="w-full overflow-hidden rounded-xl border bg-white p-5">
        <div className="mb-4 flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
            <Music className="h-5 w-5 text-zinc-500" />
          </div>

          <div className="min-w-0">
            <h4 className="truncate font-semibold text-zinc-900">
              {file.filename || "Audio lesson"}
            </h4>
            <p className="text-sm text-zinc-500">Audio resource</p>
          </div>
        </div>

        <audio controls src={file.url} className="w-full max-w-full" />
      </div>
    );
  }

  if (isPdfFile(file)) {
    return (
      <div className="w-full overflow-hidden rounded-xl border bg-white">
        <iframe
          src={file.url}
          className="h-[460px] w-full max-w-full bg-white"
          title={file.filename || "PDF document"}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-[160px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border bg-white p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
        <FileText className="h-6 w-6 text-zinc-400" />
      </div>

      <h4 className="mt-4 max-w-full break-words font-semibold text-zinc-900">
        {file.filename || "Attached file"}
      </h4>

      <p className="mt-2 text-sm text-zinc-500">
        This file cannot be previewed directly.
      </p>

      <a
        href={file.url}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
      >
        <ExternalLink className="mr-2 h-4 w-4" />
        Open file
      </a>
    </div>
  );
}

function LessonMediaList({ files }: { files?: PreviewFile[] }) {
  if (!files?.length) {
    return (
      <div className="flex min-w-0 items-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4 text-sm text-zinc-500">
        <LockKeyhole className="h-4 w-4 shrink-0" />
        <span className="min-w-0 break-words">No media for this lesson.</span>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-4">
      {files.map((file, index) => {
        const size = formatFileSize(file.sizeInBytes);

        return (
          <div
            key={file.id || `${file.url}-${index}`}
            className="min-w-0 overflow-hidden rounded-2xl border bg-zinc-50 p-4"
          >
            <div className="mb-3 flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <MediaTypePill file={file} />

                  <p className="min-w-0 break-words font-semibold text-zinc-900">
                    {file.filename || `Resource ${index + 1}`}
                  </p>
                </div>

                <p className="mt-2 max-w-full break-all text-xs leading-5 text-zinc-500">
                  {file.url}
                </p>

                <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                  {file.mimeType && (
                    <span className="break-all">{file.mimeType}</span>
                  )}
                  {size && <span>{size}</span>}
                </div>
              </div>

              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit shrink-0 items-center justify-center rounded-lg border bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open
              </a>
            </div>

            <div className="min-w-0 overflow-hidden">
              {renderLearningFile(file)}
            </div>
          </div>
        );
      })}
    </div>
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
  const summary = useMemo(() => getCourseSummary(course), [course]);
  const submitAllowed = canSubmitCourse(course.status);
  const submitLockedMessage = getSubmitLockedMessage(course.status);

  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  function toggleSection(sectionId: string) {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }

  function collapseAllSections() {
    const next: Record<string, boolean> = {};

    (course.sections ?? []).forEach((section) => {
      next[section.id] = true;
    });

    setCollapsedSections(next);
  }

  function expandAllSections() {
    setCollapsedSections({});
  }

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex w-fit items-center rounded-full border bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </button>

          {submitAllowed ? (
            rightAction
          ) : submitLockedMessage ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">
              {submitLockedMessage}
            </div>
          ) : null}
        </div>

        <section className="min-w-0 overflow-hidden rounded-2xl border bg-white p-5 shadow-sm">
          <div className="grid min-w-0 gap-5 md:grid-cols-[1fr_220px]">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap gap-2">
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

                {course.status && (
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                    {course.status}
                  </span>
                )}

                {course.certificateEnabled && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Certificate
                  </span>
                )}
              </div>

              <h1 className="mt-4 break-words text-2xl font-bold tracking-tight text-zinc-950">
                {course.title}
              </h1>

              <p className="mt-3 break-words text-sm leading-6 text-zinc-600">
                {course.shortDescription ||
                  "Preview this course before publish."}
              </p>
            </div>

            {course.thumbnailUrl && (
              <img
                src={course.thumbnailUrl}
                alt={course.title}
                className="aspect-video w-full rounded-xl border object-cover"
              />
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-zinc-50 p-4">
              <p className="text-xs font-semibold uppercase text-zinc-500">
                Sections
              </p>
              <p className="mt-1 text-2xl font-bold text-zinc-950">
                {summary.sectionCount}
              </p>
            </div>

            <div className="rounded-xl border bg-zinc-50 p-4">
              <p className="text-xs font-semibold uppercase text-zinc-500">
                Lessons
              </p>
              <p className="mt-1 text-2xl font-bold text-zinc-950">
                {summary.lessonCount}
              </p>
            </div>

            <div className="rounded-xl border bg-zinc-50 p-4">
              <p className="text-xs font-semibold uppercase text-zinc-500">
                Media
              </p>
              <p className="mt-1 text-2xl font-bold text-zinc-950">
                {summary.mediaCount}
              </p>
            </div>
          </div>
        </section>

        {course.description && (
          <section className="min-w-0 overflow-hidden rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-950">
              Course Description
            </h2>

            <p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-zinc-600">
              {course.description}
            </p>
          </section>
        )}

        <section className="min-w-0 space-y-4">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <ListVideo className="h-5 w-5 shrink-0 text-zinc-500" />
              <h2 className="min-w-0 break-words text-2xl font-bold text-zinc-950">
                Course Content
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={collapseAllSections}
                disabled={!course.sections?.length}
                className="rounded-lg border bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Collapse All
              </button>

              <button
                type="button"
                onClick={expandAllSections}
                disabled={!course.sections?.length}
                className="rounded-lg border bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Expand All
              </button>
            </div>
          </div>

          {course.sections?.length ? (
            course.sections.map((section, sectionIndex) => {
              const isCollapsed = Boolean(collapsedSections[section.id]);

              return (
                <div
                  key={section.id}
                  className="min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm"
                >
                  <div className="border-b bg-zinc-50 px-6 py-8">
                    <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleSection(section.id)}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-white text-zinc-600 transition hover:bg-zinc-100"
                            title={
                              isCollapsed
                                ? "Expand section"
                                : "Collapse section"
                            }
                          >
                            {isCollapsed ? (
                              <ChevronRight className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>

                          <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white">
                            Section {sectionIndex + 1}
                          </span>

                          {section.isActive === false && (
                            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                              Inactive
                            </span>
                          )}
                        </div>

                        <h3 className="mt-3 break-words text-xl font-bold text-zinc-950">
                          {section.title}
                        </h3>

                        {section.description && (
                          <p className="mt-2 break-words text-sm leading-6 text-zinc-600">
                            {section.description}
                          </p>
                        )}
                      </div>

                      <div className="w-fit shrink-0 rounded-xl border bg-white px-4 py-2 text-sm text-zinc-600">
                        {section.lessons?.length ?? 0} lessons
                      </div>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="min-w-0 space-y-5 p-5">
                      {section.lessons?.length ? (
                        section.lessons.map((lesson, lessonIndex) => (
                          <article
                            key={lesson.id}
                            className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5"
                          >
                            <div className="mb-4 flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-700">
                                    {lessonIndex + 1}
                                  </span>

                                  <h4 className="min-w-0 break-words text-lg font-bold text-zinc-950">
                                    {lesson.title}
                                  </h4>

                                  {lesson.isActive === false && (
                                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                                      Inactive
                                    </span>
                                  )}
                                </div>

                                {lesson.description && (
                                  <p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-zinc-600">
                                    {lesson.description}
                                  </p>
                                )}
                              </div>

                              <span className="w-fit shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                                {lesson.files?.length ?? 0} resources
                              </span>
                            </div>

                            <LessonMediaList files={lesson.files} />
                          </article>
                        ))
                      ) : (
                        <div className="flex min-w-0 items-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
                          <LockKeyhole className="h-4 w-4 shrink-0" />
                          <span>No lessons in this section.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="min-w-0 overflow-hidden rounded-2xl border bg-white px-6 py-12 text-center shadow-sm">
              <BookOpen className="mx-auto h-10 w-10 text-zinc-300" />
              <h3 className="mt-4 text-lg font-semibold text-zinc-900">
                No learning content available
              </h3>
              <p className="mt-2 text-sm text-zinc-500">
                This course does not have sections or lessons yet.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}