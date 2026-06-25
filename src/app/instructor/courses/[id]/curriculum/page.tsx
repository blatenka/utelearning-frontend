"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Edit,
  ExternalLink,
  File,
  FileText,
  FileUp,
  Film,
  GripVertical,
  Image as ImageIcon,
  LinkIcon,
  Music,
  PlusCircle,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  instructorCourseService,
  unwrapData,
  unwrapList,
} from "@/services/instructor-course.service";

import type {
  InstructorCourse,
  Lesson,
  LessonFileMedia,
  MediaType,
  Section,
  UploadSignatureResponse,
} from "@/services/instructor-course.service";

type LessonMediaType = MediaType | "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO" | "OTHER";

type UploadingState = {
  lessonId: string;
  progressText: string;
} | null;

type PendingUpload = {
  sectionId: string;
  lesson: Lesson;
  file: File;
  previewUrl: string | null;
  mediaType: LessonMediaType;
} | null;

type LessonMediaLinkForm = {
  url: string;
  filename: string;
};

type LessonFileEditState = {
  sectionId: string;
  lessonId: string;
  file: LessonFileMedia;
  form: {
    url: string;
    filename: string;
    type: LessonMediaType;
    cloudinaryPublicId: string;
    mimeType: string;
    sizeInBytes: string;
  };
} | null;

type LessonFileDeleteState = {
  sectionId: string;
  lessonId: string;
  file: LessonFileMedia;
} | null;

function getDefaultMediaLinkForm(): LessonMediaLinkForm {
  return {
    url: "",
    filename: "",
  };
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

function getMediaTypeFromFile(file: File): LessonMediaType {
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();

  if (mime.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|svg)$/.test(name)) {
    return "IMAGE";
  }

  if (mime.startsWith("video/") || /\.(mp4|mov|webm|mkv|avi)$/.test(name)) {
    return "VIDEO";
  }

  if (mime.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac)$/.test(name)) {
    return "AUDIO";
  }

  if (
    mime === "application/pdf" ||
    name.endsWith(".pdf") ||
    /\.(doc|docx|ppt|pptx|xls|xlsx|odt|ods|odp|txt|csv)$/.test(name) ||
    mime.includes("officedocument") ||
    mime.includes("msword") ||
    mime.includes("ms-excel") ||
    mime.includes("ms-powerpoint")
  ) {
    return "DOCUMENT";
  }

  return "OTHER";
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

function inferMediaTypeFromUrl(url: string): LessonMediaType {
  if (isYoutubeUrl(url)) return "VIDEO";

  const path = url.split("?")[0].toLowerCase();

  if (/\.(jpg|jpeg|png|webp|gif|svg)$/.test(path)) return "IMAGE";
  if (/\.(mp4|mov|webm|mkv|avi)$/.test(path)) return "VIDEO";
  if (/\.(mp3|wav|ogg|m4a|aac)$/.test(path)) return "AUDIO";
  if (/\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|csv)$/.test(path)) {
    return "DOCUMENT";
  }

  return "OTHER";
}

function getCloudinaryResourceType(
  mediaType: LessonMediaType
): "image" | "video" | "raw" {
  if (mediaType === "IMAGE") return "image";
  if (mediaType === "VIDEO" || mediaType === "AUDIO") return "video";
  return "raw";
}

function MediaTypeBadge({ type }: { type: LessonMediaType }) {
  const map: Record<
    string,
    { label: string; icon: ReactNode; className: string }
  > = {
    IMAGE: {
      label: "Image",
      icon: <ImageIcon className="h-3 w-3" />,
      className: "bg-violet-100 text-violet-700",
    },
    VIDEO: {
      label: "Video",
      icon: <Film className="h-3 w-3" />,
      className: "bg-blue-100 text-blue-700",
    },
    AUDIO: {
      label: "Audio",
      icon: <Music className="h-3 w-3" />,
      className: "bg-emerald-100 text-emerald-700",
    },
    DOCUMENT: {
      label: "Document",
      icon: <FileText className="h-3 w-3" />,
      className: "bg-amber-100 text-amber-700",
    },
    OTHER: {
      label: "Other",
      icon: <File className="h-3 w-3" />,
      className: "bg-zinc-100 text-zinc-600",
    },
  };

  const config = map[String(type)] ?? map.OTHER;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

function getFilenameFromUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    const filename = parsedUrl.pathname.split("/").filter(Boolean).pop();

    if (isYoutubeUrl(url)) {
      return filename || "YouTube video";
    }

    return filename || "External resource";
  } catch {
    return "External resource";
  }
}

function isValidUrl(value: string) {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function formatFileSize(size?: number | null) {
  if (size === undefined || size === null) return "Unknown size";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

async function uploadFileToCloudinary(
  file: File,
  signature: UploadSignatureResponse
) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("api_key", signature.apiKey);
  formData.append("timestamp", String(signature.timestamp));
  formData.append("signature", signature.signature);

  if (signature.uploadPreset) {
    formData.append("upload_preset", signature.uploadPreset);
  }

  if (signature.folder) {
    formData.append("folder", signature.folder);
  }

  const resourceType = signature.resourceType ?? "raw";

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/${resourceType}/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Cloudinary upload failed.");
  }

  return response.json();
}

function SortableSectionCard({
  section,
  children,
  disabled,
}: {
  section: Section;
  children: ReactNode;
  disabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-60" : ""}
    >
      <Card className="overflow-hidden border-zinc-300 bg-zinc-50 shadow-sm">
        <div className="flex items-center gap-3 border-b border-zinc-200 bg-zinc-100 px-4 py-2">
          <button
            type="button"
            {...(!disabled ? attributes : {})}
            {...(!disabled ? listeners : {})}
            disabled={disabled}
            className={`inline-flex items-center justify-center rounded-md border bg-white p-1.5 text-zinc-500 transition ${
              disabled
                ? "cursor-not-allowed opacity-50"
                : "cursor-grab hover:bg-zinc-50 active:cursor-grabbing"
            }`}
            title={
              disabled
                ? "Course is locked and cannot be reordered"
                : "Drag to reorder section"
            }
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <p className="text-xs text-zinc-500">
            Level 1 · Section container · Drag to reorder
          </p>
        </div>

        {children}
      </Card>
    </div>
  );
}

function MediaLinkForm({
  disabled,
  saving,
  form,
  onUpdate,
  onSubmit,
}: {
  lessonId: string;
  sectionId: string;
  disabled: boolean;
  saving: boolean;
  form: LessonMediaLinkForm;
  onUpdate: (patch: Partial<LessonMediaLinkForm>) => void;
  onSubmit: () => void;
}) {
  const detectedType = form.url.trim()
    ? inferMediaTypeFromUrl(form.url.trim())
    : null;

  return (
    <form
      className="mt-4 space-y-3 rounded-lg border border-dashed border-zinc-200 bg-white/80 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="space-y-2">
        <Input
          value={form.url}
          onChange={(event) => onUpdate({ url: event.target.value })}
          placeholder="Paste YouTube/watch, video, image, audio, PDF, or document URL..."
          disabled={disabled || saving}
        />

        {detectedType && (
          <p className="flex items-center gap-1.5 text-xs text-zinc-500">
            Detected type:
            <MediaTypeBadge type={detectedType} />
          </p>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <Input
          value={form.filename}
          onChange={(event) => onUpdate({ filename: event.target.value })}
          placeholder="Display name (optional)"
          disabled={disabled || saving}
        />

        <Button
          type="submit"
          size="sm"
          disabled={disabled || saving || !form.url.trim()}
        >
          <LinkIcon className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Add Link"}
        </Button>
      </div>
    </form>
  );
}

export default function CourseCurriculumPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = String(params.id);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const [course, setCourse] = useState<InstructorCourse | null>(null);
  const [courseLoading, setCourseLoading] = useState(false);

  const [sections, setSections] = useState<Section[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<
    Record<string, LessonFileMedia[]>
  >({});

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<UploadingState>(null);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload>(null);

  const [mediaLinkForms, setMediaLinkForms] = useState<
    Record<string, LessonMediaLinkForm>
  >({});
  const [savingMediaLinkLessonId, setSavingMediaLinkLessonId] = useState<
    string | null
  >(null);

  const [editingFile, setEditingFile] = useState<LessonFileEditState>(null);
  const [savingFileEdit, setSavingFileEdit] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<LessonFileDeleteState>(null);
  const [deletingFile, setDeletingFile] = useState(false);
  const [refreshingLessonFilesId, setRefreshingLessonFilesId] = useState<
    string | null
  >(null);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionDescription, setSectionDescription] = useState("");
  const [creatingSection, setCreatingSection] = useState(false);

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionTitle, setEditSectionTitle] = useState("");
  const [editSectionDescription, setEditSectionDescription] = useState("");

  const [lessonFormSectionId, setLessonFormSectionId] = useState<string | null>(
    null
  );
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");

  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editLessonTitle, setEditLessonTitle] = useState("");
  const [editLessonDescription, setEditLessonDescription] = useState("");

  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null);

  const [lessonToDelete, setLessonToDelete] = useState<{
    sectionId: string;
    lesson: Lesson;
  } | null>(null);

  const canEditCourse = (() => {
    const status = course?.status?.toUpperCase();

    return (
      !status ||
      [
        "DRAFT",
        "CHANGES_REQUESTED",
        "REJECTED",
        "NEEDS_CHANGES",
        "NEEDS_REVISION",
        "REVISION_REQUIRED",
      ].includes(status)
    );
  })();

  const lockedMessage =
    "This course is locked because it is under review, approved, or published.";

  function ensureCourseEditable() {
    if (canEditCourse) return true;

    showError(lockedMessage);
    return false;
  }

  function getMediaLinkForm(lessonId: string): LessonMediaLinkForm {
    return mediaLinkForms[lessonId] ?? getDefaultMediaLinkForm();
  }

  function updateMediaLinkForm(
    lessonId: string,
    patch: Partial<LessonMediaLinkForm>
  ) {
    setMediaLinkForms((prev) => ({
      ...prev,
      [lessonId]: {
        ...(prev[lessonId] ?? getDefaultMediaLinkForm()),
        ...patch,
      },
    }));
  }

  function showSuccess(message: string) {
    setError("");
    setSuccessMessage(message);
  }

  function showError(message: string) {
    setSuccessMessage("");
    setError(message);
  }

  async function fetchCurrentCourse() {
    try {
      setCourseLoading(true);

      const response = await instructorCourseService.getMyCourses({
        page: 1,
        limit: 100,
      });

      const courseList = unwrapList<InstructorCourse>(response);
      setCourse(courseList.find((item) => item.id === courseId) ?? null);
    } catch {
      setCourse(null);
    } finally {
      setCourseLoading(false);
    }
  }

  async function fetchLessonFiles(sectionId: string, lessonId: string) {
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
  }

  async function refreshLessonFiles(sectionId: string, lessonId: string) {
    try {
      setRefreshingLessonFilesId(lessonId);

      const files = await fetchLessonFiles(sectionId, lessonId);

      setUploadedFiles((prev) => ({
        ...prev,
        [lessonId]: files,
      }));
    } catch (err) {
      showError(getErrorMessage(err, "Failed to load lesson media files."));
    } finally {
      setRefreshingLessonFilesId(null);
    }
  }

  async function fetchSectionsAndLessons(silent = false) {
    try {
      if (!silent) setLoading(true);
      setError("");

      const sectionResponse = await instructorCourseService.getSections(
        courseId,
        {
          sortField: "sectionIndex",
          sortDirection: "asc",
          limit: 100,
        }
      );

      const sectionList = unwrapList<Section>(sectionResponse);
      const nextUploadedFiles: Record<string, LessonFileMedia[]> = {};

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

            await Promise.all(
              lessons.map(async (lesson) => {
                try {
                  nextUploadedFiles[lesson.id] = await fetchLessonFiles(
                    section.id,
                    lesson.id
                  );
                } catch {
                  nextUploadedFiles[lesson.id] = [];
                }
              })
            );

            return {
              ...section,
              lessons,
            };
          } catch {
            return {
              ...section,
              lessons: section.lessons ?? [],
            };
          }
        })
      );

      setSections(sectionsWithLessons);
      setUploadedFiles(nextUploadedFiles);
    } catch (err) {
      showError(getErrorMessage(err, "Failed to load curriculum."));
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function handleCreateSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!ensureCourseEditable()) return;

    try {
      setCreatingSection(true);
      setError("");
      setSuccessMessage("");

      await instructorCourseService.createSection(courseId, {
        title: sectionTitle,
        description: sectionDescription || undefined,
      });

      setSectionTitle("");
      setSectionDescription("");
      showSuccess("Section created successfully.");
      await fetchSectionsAndLessons(true);
    } catch (err) {
      showError(getErrorMessage(err, "Failed to create section."));
    } finally {
      setCreatingSection(false);
    }
  }

  function startEditSection(section: Section) {
    if (!ensureCourseEditable()) return;

    setEditingSectionId(section.id);
    setEditSectionTitle(section.title);
    setEditSectionDescription(section.description ?? "");
  }

  async function handleUpdateSection(sectionId: string) {
    if (!ensureCourseEditable()) return;

    try {
      setError("");
      setSuccessMessage("");

      await instructorCourseService.updateSection(courseId, sectionId, {
        title: editSectionTitle,
        description: editSectionDescription || null,
      });

      setEditingSectionId(null);
      showSuccess("Section updated successfully.");
      await fetchSectionsAndLessons(true);
    } catch (err) {
      showError(getErrorMessage(err, "Failed to update section."));
    }
  }

  function handleDeleteSection(section: Section) {
    if (!ensureCourseEditable()) return;

    setSectionToDelete(section);
  }

  async function confirmDeleteSection() {
    if (!sectionToDelete) return;
    if (!ensureCourseEditable()) return;

    try {
      setError("");
      setSuccessMessage("");

      await instructorCourseService.deleteSection(courseId, sectionToDelete.id);

      setSectionToDelete(null);
      showSuccess("Section deleted successfully.");
      await fetchSectionsAndLessons(true);
    } catch (err) {
      showError(getErrorMessage(err, "Failed to delete section."));
    }
  }

  async function handleToggleSection(section: Section) {
    if (!ensureCourseEditable()) return;

    try {
      setError("");
      setSuccessMessage("");

      await instructorCourseService.changeSectionStatus(
        courseId,
        section.id,
        !section.isActive
      );

      showSuccess(
        section.isActive
          ? "Section disabled successfully."
          : "Section enabled successfully."
      );
      await fetchSectionsAndLessons(true);
    } catch (err) {
      showError(getErrorMessage(err, "Failed to update section."));
    }
  }

  async function handleCreateLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lessonFormSectionId) return;
    if (!ensureCourseEditable()) return;

    try {
      setError("");
      setSuccessMessage("");

      await instructorCourseService.createLesson(courseId, lessonFormSectionId, {
        title: lessonTitle,
        description: lessonDescription || null,
      });

      setLessonTitle("");
      setLessonDescription("");
      setLessonFormSectionId(null);
      showSuccess("Lesson created successfully.");
      await fetchSectionsAndLessons(true);
    } catch (err) {
      showError(getErrorMessage(err, "Failed to create lesson."));
    }
  }

  function startEditLesson(lesson: Lesson) {
    if (!ensureCourseEditable()) return;

    setEditingLessonId(lesson.id);
    setEditLessonTitle(lesson.title);
    setEditLessonDescription(lesson.description ?? "");
  }

  async function handleUpdateLesson(sectionId: string, lessonId: string) {
    if (!ensureCourseEditable()) return;

    try {
      setError("");
      setSuccessMessage("");

      await instructorCourseService.updateLesson(courseId, sectionId, lessonId, {
        title: editLessonTitle,
        description: editLessonDescription || null,
      });

      setEditingLessonId(null);
      showSuccess("Lesson updated successfully.");
      await fetchSectionsAndLessons(true);
    } catch (err) {
      showError(getErrorMessage(err, "Failed to update lesson."));
    }
  }

  function handleDeleteLesson(sectionId: string, lesson: Lesson) {
    if (!ensureCourseEditable()) return;

    setLessonToDelete({
      sectionId,
      lesson,
    });
  }

  async function confirmDeleteLesson() {
    if (!lessonToDelete) return;
    if (!ensureCourseEditable()) return;

    try {
      setError("");
      setSuccessMessage("");

      await instructorCourseService.deleteLesson(
        courseId,
        lessonToDelete.sectionId,
        lessonToDelete.lesson.id
      );

      setLessonToDelete(null);
      showSuccess("Lesson deleted successfully.");
      await fetchSectionsAndLessons(true);
    } catch (err) {
      showError(getErrorMessage(err, "Failed to delete lesson."));
    }
  }

  async function handleToggleLesson(sectionId: string, lesson: Lesson) {
    if (!ensureCourseEditable()) return;

    try {
      setError("");
      setSuccessMessage("");

      await instructorCourseService.updateLesson(courseId, sectionId, lesson.id, {
        isActive: !lesson.isActive,
      });

      showSuccess(
        lesson.isActive
          ? "Lesson disabled successfully."
          : "Lesson enabled successfully."
      );
      await fetchSectionsAndLessons(true);
    } catch (err) {
      showError(getErrorMessage(err, "Failed to update lesson."));
    }
  }

  async function handleSectionDragEnd(event: DragEndEvent) {
    if (!ensureCourseEditable()) return;

    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((section) => section.id === active.id);
    const newIndex = sections.findIndex((section) => section.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sections, oldIndex, newIndex);
    setSections(reordered);

    try {
      await instructorCourseService.reorderSections(
        courseId,
        reordered.map((section) => section.id)
      );

      showSuccess("Sections reordered successfully.");
      await fetchSectionsAndLessons(true);
    } catch (err) {
      showError(getErrorMessage(err, "Failed to reorder sections."));
      await fetchSectionsAndLessons(true);
    }
  }

  async function moveLesson(
    sectionId: string,
    lessonId: string,
    direction: "up" | "down"
  ) {
    if (!ensureCourseEditable()) return;

    const section = sections.find((item) => item.id === sectionId);
    if (!section?.lessons) return;

    const currentIndex = section.lessons.findIndex(
      (lesson) => lesson.id === lessonId
    );

    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= section.lessons.length) return;

    const copied = [...section.lessons];

    [copied[currentIndex], copied[targetIndex]] = [
      copied[targetIndex],
      copied[currentIndex],
    ];

    setSections((prev) =>
      prev.map((item) =>
        item.id === sectionId ? { ...item, lessons: copied } : item
      )
    );

    try {
      await instructorCourseService.reorderLessons(
        courseId,
        sectionId,
        copied.map((lesson) => lesson.id)
      );

      showSuccess("Lessons reordered successfully.");
      await fetchSectionsAndLessons(true);
    } catch (err) {
      showError(getErrorMessage(err, "Failed to reorder lessons."));
      await fetchSectionsAndLessons(true);
    }
  }

  async function handleAttachLessonMediaUrl(sectionId: string, lesson: Lesson) {
    if (!ensureCourseEditable()) return;

    const form = getMediaLinkForm(lesson.id);
    const url = form.url.trim();

    if (!url) {
      showError("Media URL is required.");
      return;
    }

    if (!isValidUrl(url)) {
      showError("Media URL is invalid.");
      return;
    }

    try {
      setSavingMediaLinkLessonId(lesson.id);
      setError("");
      setSuccessMessage("");

      const type = inferMediaTypeFromUrl(url);
      const filename = form.filename.trim() || getFilenameFromUrl(url);

      const mediaResponse = await instructorCourseService.createLessonFile(
        courseId,
        sectionId,
        lesson.id,
        {
          cloudinaryPublicId: null,
          url,
          type: type as MediaType,
          filename,
          mimeType: null,
          sizeInBytes: null,
        }
      );

      const savedMedia = unwrapData<LessonFileMedia>(mediaResponse);

      setUploadedFiles((prev) => ({
        ...prev,
        [lesson.id]: [savedMedia, ...(prev[lesson.id] ?? [])],
      }));

      setMediaLinkForms((prev) => ({
        ...prev,
        [lesson.id]: getDefaultMediaLinkForm(),
      }));

      showSuccess("Lesson media link added successfully.");
    } catch (err) {
      showError(getErrorMessage(err, "Failed to add lesson media link."));
    } finally {
      setSavingMediaLinkLessonId(null);
    }
  }

  function handleSelectLessonFile(sectionId: string, lesson: Lesson, file: File) {
    if (!ensureCourseEditable()) return;

    const mediaType = getMediaTypeFromFile(file);
    const previewUrl =
      mediaType === "IMAGE" || mediaType === "VIDEO"
        ? URL.createObjectURL(file)
        : null;

    if (pendingUpload?.previewUrl) {
      URL.revokeObjectURL(pendingUpload.previewUrl);
    }

    setPendingUpload({
      sectionId,
      lesson,
      file,
      previewUrl,
      mediaType,
    });

    setError("");
    setSuccessMessage("");
  }

  function cancelPendingUpload() {
    if (pendingUpload?.previewUrl) {
      URL.revokeObjectURL(pendingUpload.previewUrl);
    }

    setPendingUpload(null);
  }

  async function handleConfirmUploadLessonFile() {
    if (!pendingUpload) return;
    if (!ensureCourseEditable()) return;

    const { sectionId, lesson, file, mediaType } = pendingUpload;

    try {
      setUploading({
        lessonId: lesson.id,
        progressText: "Getting upload signature...",
      });
      setError("");
      setSuccessMessage("");

      const resourceType = getCloudinaryResourceType(mediaType);

      const signatureResponse =
        await instructorCourseService.getUploadSignature({
          entityType: "lesson",
          entityId: lesson.id,
          resourceType,
          subFolder: "files",
        });

      const signature = unwrapData<UploadSignatureResponse>(signatureResponse);

      setUploading({
        lessonId: lesson.id,
        progressText: "Uploading to Cloudinary...",
      });

      const cloudinaryResult = await uploadFileToCloudinary(file, signature);

      setUploading({
        lessonId: lesson.id,
        progressText: "Saving media information...",
      });

      const mediaResponse = await instructorCourseService.createLessonFile(
        courseId,
        sectionId,
        lesson.id,
        {
          cloudinaryPublicId: cloudinaryResult.public_id ?? null,
          url: cloudinaryResult.secure_url,
          type: mediaType as MediaType,
          filename: file.name,
          mimeType: file.type || null,
          sizeInBytes: file.size,
        }
      );

      const savedMedia = unwrapData<LessonFileMedia>(mediaResponse);

      setUploadedFiles((prev) => ({
        ...prev,
        [lesson.id]: [savedMedia, ...(prev[lesson.id] ?? [])],
      }));

      if (pendingUpload.previewUrl) {
        URL.revokeObjectURL(pendingUpload.previewUrl);
      }

      setPendingUpload(null);
      showSuccess("Lesson media uploaded successfully.");
    } catch (err) {
      showError(getErrorMessage(err, "Failed to upload lesson media."));
    } finally {
      setUploading(null);
    }
  }

  function startEditFile(
    sectionId: string,
    lessonId: string,
    file: LessonFileMedia
  ) {
    if (!ensureCourseEditable()) return;

    setEditingFile({
      sectionId,
      lessonId,
      file,
      form: {
        url: file.url || "",
        filename: file.filename || "",
        type: file.type as LessonMediaType,
        cloudinaryPublicId: file.cloudinaryPublicId || "",
        mimeType: file.mimeType || "",
        sizeInBytes:
          file.sizeInBytes === undefined || file.sizeInBytes === null
            ? ""
            : String(file.sizeInBytes),
      },
    });
  }

  function updateEditingFileForm(
    patch: Partial<NonNullable<LessonFileEditState>["form"]>
  ) {
    setEditingFile((prev) =>
      prev
        ? {
            ...prev,
            form: {
              ...prev.form,
              ...patch,
            },
          }
        : prev
    );
  }

  async function handleUpdateFileMedia() {
    if (!editingFile) return;
    if (!ensureCourseEditable()) return;

    if (!editingFile.form.url.trim()) {
      showError("File URL is required.");
      return;
    }

    if (!isValidUrl(editingFile.form.url.trim())) {
      showError("File URL is invalid.");
      return;
    }

    try {
      setSavingFileEdit(true);
      setError("");
      setSuccessMessage("");

      const payload = {
        cloudinaryPublicId:
          editingFile.form.cloudinaryPublicId.trim() || null,
        url: editingFile.form.url.trim(),
        type: editingFile.form.type as MediaType,
        filename: editingFile.form.filename.trim() || null,
        mimeType: editingFile.form.mimeType.trim() || null,
        sizeInBytes:
          editingFile.form.sizeInBytes.trim() === ""
            ? null
            : Number(editingFile.form.sizeInBytes),
      };

      const response = await instructorCourseService.updateLessonFile(
        courseId,
        editingFile.sectionId,
        editingFile.lessonId,
        editingFile.file.id,
        payload
      );

      const updatedFile = unwrapData<LessonFileMedia>(response);

      setUploadedFiles((prev) => ({
        ...prev,
        [editingFile.lessonId]: (prev[editingFile.lessonId] ?? []).map((file) =>
          file.id === updatedFile.id ? updatedFile : file
        ),
      }));

      setEditingFile(null);
      showSuccess("Lesson media updated successfully.");
    } catch (err) {
      showError(getErrorMessage(err, "Failed to update lesson media."));
    } finally {
      setSavingFileEdit(false);
    }
  }

  async function confirmDeleteFileMedia() {
    if (!fileToDelete) return;
    if (!ensureCourseEditable()) return;

    try {
      setDeletingFile(true);
      setError("");
      setSuccessMessage("");

      await instructorCourseService.deleteLessonFile(
        courseId,
        fileToDelete.sectionId,
        fileToDelete.lessonId,
        fileToDelete.file.id
      );

      setUploadedFiles((prev) => ({
        ...prev,
        [fileToDelete.lessonId]: (prev[fileToDelete.lessonId] ?? []).filter(
          (file) => file.id !== fileToDelete.file.id
        ),
      }));

      setFileToDelete(null);
      showSuccess("Lesson media deleted successfully.");
    } catch (err) {
      showError(getErrorMessage(err, "Failed to delete lesson media."));
    } finally {
      setDeletingFile(false);
    }
  }

  useEffect(() => {
    fetchCurrentCourse();
    fetchSectionsAndLessons();
  }, [courseId]);

  useEffect(() => {
    return () => {
      if (pendingUpload?.previewUrl) {
        URL.revokeObjectURL(pendingUpload.previewUrl);
      }
    };
  }, [pendingUpload?.previewUrl]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <button
          type="button"
          onClick={() => router.push("/instructor/courses")}
          className="mb-3 inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to my courses
        </button>

        <Card className="overflow-hidden">
          <CardHeader>
            {courseLoading ? (
              <>
                <CardTitle>Loading course...</CardTitle>
                <CardDescription>
                  Please wait while we load the course information.
                </CardDescription>
              </>
            ) : course ? (
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-2xl">{course.title}</CardTitle>

                    {course.status && (
                      <Badge variant="outline">{course.status}</Badge>
                    )}

                    {course.level && <Badge>{course.level}</Badge>}

                    {course.isActive === false && (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </div>

                  <CardDescription className="text-base">
                    {course.shortDescription}
                  </CardDescription>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      router.push(`/instructor/courses/${courseId}/edit`)
                    }
                  >
                    Edit Course Info
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      router.push(`/instructor/courses/${courseId}/assessments`)
                    }
                  >
                    Assessments
                  </Button>

                  {course.thumbnailUrl && (
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="h-28 w-full rounded-lg object-cover md:w-44"
                    />
                  )}
                </div>
              </div>
            ) : (
              <>
                <CardTitle>Course not found</CardTitle>
                <CardDescription>
                  This course could not be found in your instructor course list.
                </CardDescription>
              </>
            )}
          </CardHeader>

          {course && (
            <CardContent>
              <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-4">
                <div>
                  <p className="font-medium text-foreground">Language</p>
                  <p>{course.language || "Not set"}</p>
                </div>

                <div>
                  <p className="font-medium text-foreground">Price</p>
                  <p>
                    {typeof course.price === "number"
                      ? `${course.price.toLocaleString("vi-VN")} VND`
                      : "Free / Not set"}
                  </p>
                </div>

                <div>
                  <p className="font-medium text-foreground">Certificate</p>
                  <p>{course.certificateEnabled ? "Enabled" : "Disabled"}</p>
                </div>

                <div>
                  <p className="font-medium text-foreground">Course ID</p>
                  <p className="truncate">{course.id}</p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {course && !canEditCourse && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {lockedMessage} You can view the curriculum, but editing, uploading,
          deleting, and reordering are disabled.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add Section</CardTitle>
          <CardDescription>
            A section is a chapter or major part of your course.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleCreateSection} className="space-y-4">
            <Input
              value={sectionTitle}
              onChange={(event) => setSectionTitle(event.target.value)}
              placeholder="Section title"
              required
              maxLength={255}
              disabled={!canEditCourse}
            />

            <div>
              <Textarea
                value={sectionDescription}
                onChange={(event) => setSectionDescription(event.target.value)}
                placeholder="Section description"
                maxLength={255}
                disabled={!canEditCourse}
              />

              <p className="mt-1 text-xs text-muted-foreground">
                {sectionDescription.length}/255 characters
              </p>
            </div>

            <Button type="submit" disabled={creatingSection || !canEditCourse}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {creatingSection ? "Creating..." : "Add Section"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Loading curriculum...</p>
      ) : sections.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No sections yet</CardTitle>
            <CardDescription>
              Add your first section to start building this course.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleSectionDragEnd}
        >
          <SortableContext
            items={sections.map((section) => section.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-5">
              {sections.map((section, sectionIndex) => (
                <SortableSectionCard
                  key={section.id}
                  section={section}
                  disabled={!canEditCourse}
                >
                  <CardHeader>
                    {editingSectionId === section.id ? (
                      <div className="space-y-3">
                        <Input
                          value={editSectionTitle}
                          onChange={(event) =>
                            setEditSectionTitle(event.target.value)
                          }
                          disabled={!canEditCourse}
                          maxLength={255}
                        />

                        <div>
                          <Textarea
                            value={editSectionDescription}
                            onChange={(event) =>
                              setEditSectionDescription(event.target.value)
                            }
                            disabled={!canEditCourse}
                            maxLength={255}
                          />

                          <p className="mt-1 text-xs text-muted-foreground">
                            {editSectionDescription.length}/255 characters
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            type="button"
                            onClick={() => handleUpdateSection(section.id)}
                            disabled={!canEditCourse}
                          >
                            <Save className="mr-2 h-4 w-4" />
                            Save
                          </Button>

                          <Button
                            size="sm"
                            type="button"
                            variant="outline"
                            onClick={() => setEditingSectionId(null)}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <CardTitle>
                              Section {sectionIndex + 1}: {section.title}
                            </CardTitle>

                            <Badge
                              variant={
                                section.isActive ? "default" : "secondary"
                              }
                            >
                              {section.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>

                          {section.description && (
                            <CardDescription className="mt-1">
                              {section.description}
                            </CardDescription>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            type="button"
                            variant="outline"
                            onClick={() => handleToggleSection(section)}
                            disabled={!canEditCourse}
                          >
                            {section.isActive ? "Disable" : "Enable"}
                          </Button>

                          <Button
                            size="sm"
                            type="button"
                            variant="outline"
                            onClick={() => startEditSection(section)}
                            disabled={!canEditCourse}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Button>

                          <Button
                            size="sm"
                            type="button"
                            variant="destructive"
                            onClick={() => handleDeleteSection(section)}
                            disabled={!canEditCourse}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {section.lessons?.length ? (
                        section.lessons.map(
                          (lesson: Lesson, lessonIndex: number) => {
                            const lessonFiles = uploadedFiles[lesson.id] ?? [];

                            return (
                              <div
                                key={lesson.id}
                                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
                              >
                                {editingLessonId === lesson.id ? (
                                  <div className="space-y-3">
                                    <Input
                                      value={editLessonTitle}
                                      onChange={(event) =>
                                        setEditLessonTitle(event.target.value)
                                      }
                                      disabled={!canEditCourse}
                                      maxLength={255}
                                    />

                                    <Textarea
                                      value={editLessonDescription}
                                      onChange={(event) =>
                                        setEditLessonDescription(
                                          event.target.value
                                        )
                                      }
                                      disabled={!canEditCourse}
                                      maxLength={2000}
                                    />

                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        type="button"
                                        onClick={() =>
                                          handleUpdateLesson(
                                            section.id,
                                            lesson.id
                                          )
                                        }
                                        disabled={!canEditCourse}
                                      >
                                        Save
                                      </Button>

                                      <Button
                                        size="sm"
                                        type="button"
                                        variant="outline"
                                        onClick={() => setEditingLessonId(null)}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                      <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="font-medium">
                                            Lesson {lessonIndex + 1}:{" "}
                                            {lesson.title}
                                          </p>

                                          <Badge
                                            variant={
                                              lesson.isActive
                                                ? "default"
                                                : "secondary"
                                            }
                                          >
                                            {lesson.isActive
                                              ? "Active"
                                              : "Inactive"}
                                          </Badge>

                                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                                            Level 2 · Lesson
                                          </span>
                                        </div>

                                        {lesson.description && (
                                          <p className="mt-1 text-sm text-muted-foreground">
                                            {lesson.description}
                                          </p>
                                        )}
                                      </div>

                                      <div className="flex flex-wrap gap-2">
                                        <Button
                                          size="sm"
                                          type="button"
                                          variant="outline"
                                          disabled={
                                            lessonIndex === 0 || !canEditCourse
                                          }
                                          onClick={() =>
                                            moveLesson(
                                              section.id,
                                              lesson.id,
                                              "up"
                                            )
                                          }
                                        >
                                          Up
                                        </Button>

                                        <Button
                                          size="sm"
                                          type="button"
                                          variant="outline"
                                          disabled={
                                            lessonIndex ===
                                              (section.lessons?.length ?? 0) -
                                                1 || !canEditCourse
                                          }
                                          onClick={() =>
                                            moveLesson(
                                              section.id,
                                              lesson.id,
                                              "down"
                                            )
                                          }
                                        >
                                          Down
                                        </Button>

                                        <Button
                                          size="sm"
                                          type="button"
                                          variant="outline"
                                          onClick={() =>
                                            handleToggleLesson(
                                              section.id,
                                              lesson
                                            )
                                          }
                                          disabled={!canEditCourse}
                                        >
                                          {lesson.isActive
                                            ? "Disable"
                                            : "Enable"}
                                        </Button>

                                        <Button
                                          size="sm"
                                          type="button"
                                          variant="outline"
                                          onClick={() => startEditLesson(lesson)}
                                          disabled={!canEditCourse}
                                        >
                                          Edit
                                        </Button>

                                        <Button
                                          size="sm"
                                          type="button"
                                          variant="destructive"
                                          onClick={() =>
                                            handleDeleteLesson(
                                              section.id,
                                              lesson
                                            )
                                          }
                                          disabled={!canEditCourse}
                                        >
                                          Delete
                                        </Button>
                                      </div>
                                    </div>

                                    <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/70 p-3">
                                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div>
                                          <p className="text-sm font-medium">
                                            Lesson Media
                                          </p>

                                          <p className="text-xs text-zinc-500">
                                            Upload a file or paste a media URL.
                                            Existing media is loaded from the
                                            backend and can be edited or deleted.
                                          </p>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                              refreshLessonFiles(
                                                section.id,
                                                lesson.id
                                              )
                                            }
                                            disabled={
                                              refreshingLessonFilesId ===
                                              lesson.id
                                            }
                                          >
                                            <RefreshCw className="mr-2 h-4 w-4" />
                                            {refreshingLessonFilesId ===
                                            lesson.id
                                              ? "Refreshing..."
                                              : "Refresh"}
                                          </Button>

                                          <label className="inline-flex cursor-pointer items-center justify-center rounded-md border bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50">
                                            <FileUp className="mr-2 h-4 w-4" />
                                            Upload File

                                            <input
                                              type="file"
                                              className="hidden"
                                              disabled={
                                                !canEditCourse ||
                                                uploading?.lessonId ===
                                                  lesson.id
                                              }
                                              onChange={(event) => {
                                                const file =
                                                  event.target.files?.[0];

                                                if (file) {
                                                  handleSelectLessonFile(
                                                    section.id,
                                                    lesson,
                                                    file
                                                  );
                                                }

                                                event.target.value = "";
                                              }}
                                            />
                                          </label>
                                        </div>
                                      </div>

                                      <MediaLinkForm
                                        lessonId={lesson.id}
                                        sectionId={section.id}
                                        disabled={!canEditCourse}
                                        saving={
                                          savingMediaLinkLessonId === lesson.id
                                        }
                                        form={getMediaLinkForm(lesson.id)}
                                        onUpdate={(patch) =>
                                          updateMediaLinkForm(lesson.id, patch)
                                        }
                                        onSubmit={() =>
                                          handleAttachLessonMediaUrl(
                                            section.id,
                                            lesson
                                          )
                                        }
                                      />

                                      {uploading?.lessonId === lesson.id && (
                                        <p className="mt-2 text-xs text-blue-600">
                                          {uploading.progressText}
                                        </p>
                                      )}

                                      {lessonFiles.length ? (
                                        <div className="mt-3 space-y-2">
                                          {lessonFiles.map((file) => (
                                            <div
                                              key={file.id}
                                              className="rounded-md border bg-white px-3 py-2 text-sm"
                                            >
                                              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                                <div className="min-w-0">
                                                  <div className="flex flex-wrap items-center gap-2">
                                                    <p className="max-w-md truncate font-medium">
                                                      {file.filename ||
                                                        "Lesson media"}
                                                    </p>

                                                    <MediaTypeBadge
                                                      type={
                                                        file.type as LessonMediaType
                                                      }
                                                    />
                                                  </div>

                                                  <p className="mt-1 truncate text-xs text-zinc-500">
                                                    {file.url}
                                                  </p>

                                                  <p className="mt-1 text-xs text-zinc-500">
                                                    {file.mimeType ||
                                                      "No MIME type"}{" "}
                                                    ·{" "}
                                                    {formatFileSize(
                                                      file.sizeInBytes
                                                    )}
                                                  </p>
                                                </div>

                                                <div className="flex shrink-0 flex-wrap gap-2">
                                                  <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                      window.open(
                                                        file.url,
                                                        "_blank",
                                                        "noopener,noreferrer"
                                                      )
                                                    }
                                                  >
                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                    Open
                                                  </Button>

                                                  <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                      startEditFile(
                                                        section.id,
                                                        lesson.id,
                                                        file
                                                      )
                                                    }
                                                    disabled={!canEditCourse}
                                                  >
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Edit
                                                  </Button>

                                                  <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() =>
                                                      setFileToDelete({
                                                        sectionId: section.id,
                                                        lessonId: lesson.id,
                                                        file,
                                                      })
                                                    }
                                                    disabled={!canEditCourse}
                                                  >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                  </Button>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="mt-2 text-xs text-zinc-500">
                                          No media files for this lesson yet.
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          }
                        )
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No lessons in this section yet.
                        </p>
                      )}
                    </div>

                    {lessonFormSectionId === section.id ? (
                      <form
                        onSubmit={handleCreateLesson}
                        className="space-y-3 rounded-lg border bg-white p-4"
                      >
                        <Input
                          value={lessonTitle}
                          onChange={(event) =>
                            setLessonTitle(event.target.value)
                          }
                          placeholder="Lesson title"
                          required
                          minLength={3}
                          maxLength={255}
                          disabled={!canEditCourse}
                        />

                        <Textarea
                          value={lessonDescription}
                          onChange={(event) =>
                            setLessonDescription(event.target.value)
                          }
                          placeholder="Lesson description"
                          maxLength={2000}
                          disabled={!canEditCourse}
                        />

                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            size="sm"
                            disabled={!canEditCourse}
                          >
                            Add Lesson
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setLessonFormSectionId(null);
                              setLessonTitle("");
                              setLessonDescription("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => setLessonFormSectionId(section.id)}
                        disabled={!canEditCourse}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Lesson
                      </Button>
                    )}
                  </CardContent>
                </SortableSectionCard>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {editingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  Edit lesson media
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Update the saved file media information.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingFile(null)}
                disabled={savingFileEdit}
                className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">URL</label>
                <Input
                  value={editingFile.form.url}
                  onChange={(event) =>
                    updateEditingFileForm({ url: event.target.value })
                  }
                  disabled={savingFileEdit}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Filename
                </label>
                <Input
                  value={editingFile.form.filename}
                  onChange={(event) =>
                    updateEditingFileForm({ filename: event.target.value })
                  }
                  disabled={savingFileEdit}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Type</label>
                  <select
                    value={editingFile.form.type}
                    onChange={(event) =>
                      updateEditingFileForm({
                        type: event.target.value as LessonMediaType,
                      })
                    }
                    disabled={savingFileEdit}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="VIDEO">Video</option>
                    <option value="IMAGE">Image</option>
                    <option value="AUDIO">Audio</option>
                    <option value="DOCUMENT">Document</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Size in bytes
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={editingFile.form.sizeInBytes}
                    onChange={(event) =>
                      updateEditingFileForm({
                        sizeInBytes: event.target.value,
                      })
                    }
                    disabled={savingFileEdit}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  MIME type
                </label>
                <Input
                  value={editingFile.form.mimeType}
                  onChange={(event) =>
                    updateEditingFileForm({ mimeType: event.target.value })
                  }
                  disabled={savingFileEdit}
                  placeholder="video/mp4, image/png, application/pdf..."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Cloudinary public ID
                </label>
                <Input
                  value={editingFile.form.cloudinaryPublicId}
                  onChange={(event) =>
                    updateEditingFileForm({
                      cloudinaryPublicId: event.target.value,
                    })
                  }
                  disabled={savingFileEdit}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingFile(null)}
                disabled={savingFileEdit}
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleUpdateFileMedia}
                disabled={savingFileEdit || !canEditCourse}
              >
                {savingFileEdit ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-zinc-900">
              Delete lesson media?
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              This media record will be removed from this lesson.
            </p>

            <div className="mt-4 rounded-lg border bg-zinc-50 p-3 text-sm">
              <p className="font-medium text-zinc-900">
                {fileToDelete.file.filename || "Lesson media"}
              </p>

              <p className="mt-1 truncate text-xs text-zinc-500">
                {fileToDelete.file.url}
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFileToDelete(null)}
                disabled={deletingFile}
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={confirmDeleteFileMedia}
                disabled={deletingFile || !canEditCourse}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deletingFile ? "Deleting..." : "Delete Media"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {pendingUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  Preview lesson media
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Check the selected file before uploading it to this lesson.
                </p>
              </div>

              <button
                type="button"
                onClick={cancelPendingUpload}
                disabled={Boolean(uploading)}
                className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl border bg-zinc-50 p-4">
              {pendingUpload.mediaType === "IMAGE" &&
              pendingUpload.previewUrl ? (
                <img
                  src={pendingUpload.previewUrl}
                  alt={pendingUpload.file.name}
                  className="max-h-72 w-full rounded-lg object-contain"
                />
              ) : pendingUpload.mediaType === "VIDEO" &&
                pendingUpload.previewUrl ? (
                <video
                  src={pendingUpload.previewUrl}
                  controls
                  className="max-h-72 w-full rounded-lg"
                />
              ) : (
                <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed bg-white p-6 text-center">
                  <FileUp className="mb-3 h-8 w-8 text-zinc-400" />

                  <p className="text-sm font-medium text-zinc-800">
                    {pendingUpload.file.name}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    This file type cannot be previewed. It will be uploaded as{" "}
                    <strong>{pendingUpload.mediaType}</strong>.
                  </p>
                </div>
              )}

              <div className="mt-4 space-y-1 text-sm text-zinc-600">
                <p>
                  <span className="font-medium text-zinc-900">Lesson:</span>{" "}
                  {pendingUpload.lesson.title}
                </p>

                <p>
                  <span className="font-medium text-zinc-900">File:</span>{" "}
                  {pendingUpload.file.name}
                </p>

                <p>
                  <span className="font-medium text-zinc-900">
                    Detected type:
                  </span>{" "}
                  <MediaTypeBadge type={pendingUpload.mediaType} />
                </p>

                <p>
                  <span className="font-medium text-zinc-900">Size:</span>{" "}
                  {formatFileSize(pendingUpload.file.size)}
                </p>
              </div>
            </div>

            {uploading?.lessonId === pendingUpload.lesson.id && (
              <p className="mt-3 text-sm text-blue-600">
                {uploading.progressText}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={cancelPendingUpload}
                disabled={Boolean(uploading)}
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleConfirmUploadLessonFile}
                disabled={Boolean(uploading) || !canEditCourse}
              >
                {uploading ? "Uploading..." : "Confirm Upload"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {sectionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-zinc-900">
              Delete section?
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              This section will be removed from the course. Lessons inside this
              section may also be removed depending on backend rules.
            </p>

            <div className="mt-4 rounded-lg border bg-zinc-50 p-3 text-sm">
              <p className="font-medium text-zinc-900">
                {sectionToDelete.title}
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                {sectionToDelete.description || "No description"}
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSectionToDelete(null)}
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={confirmDeleteSection}
                disabled={!canEditCourse}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Section
              </Button>
            </div>
          </div>
        </div>
      )}

      {lessonToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-zinc-900">
              Delete lesson?
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              This lesson will be removed from the section. This action cannot
              be undone.
            </p>

            <div className="mt-4 rounded-lg border bg-zinc-50 p-3 text-sm">
              <p className="font-medium text-zinc-900">
                {lessonToDelete.lesson.title}
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                {lessonToDelete.lesson.description || "No description"}
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLessonToDelete(null)}
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={confirmDeleteLesson}
                disabled={!canEditCourse}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Lesson
              </Button>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  Success
                </h2>

                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600">
                  {successMessage}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button type="button" onClick={() => setSuccessMessage("")}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}