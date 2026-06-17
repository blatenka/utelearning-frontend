"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Edit,
  FileUp,
  GripVertical,
  PlusCircle,
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

type UploadingState = {
  lessonId: string;
  progressText: string;
} | null;

type PendingUpload = {
  sectionId: string;
  lesson: Lesson;
  file: File;
  previewUrl: string | null;
  mediaType: MediaType;
} | null;

function getCloudinaryResourceType(file: File): "image" | "video" | "raw" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "raw";
}

function getMediaType(file: File): MediaType {
  if (file.type.startsWith("image/")) return "IMAGE";
  if (file.type.startsWith("video/")) return "VIDEO";
  return "RAW";
}

function formatFileSize(size: number) {
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

  const resourceType = signature.resourceType || getCloudinaryResourceType(file);

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
}: {
  section: Section;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-60" : ""}
    >
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="inline-flex cursor-grab items-center justify-center rounded-md border bg-background p-1.5 text-muted-foreground transition hover:bg-muted active:cursor-grabbing"
            title="Drag to reorder section"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <p className="text-xs text-muted-foreground">
            Drag this section to reorder
          </p>
        </div>

        {children}
      </Card>
    </div>
  );
}

export default function CourseCurriculumPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = String(params.id);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
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

  const canEditDraft = (() => {
    const status = course?.status?.toUpperCase();
    return !status || status === "DRAFT" || status === "NEEDS_CHANGES";
  })();

  async function fetchCurrentCourse() {
    try {
      setCourseLoading(true);

      const response = await instructorCourseService.getMyCourses({
        page: 1,
        limit: 100,
      });

      const courseList = unwrapList<InstructorCourse>(response);
      const currentCourse = courseList.find((item) => item.id === courseId);

      setCourse(currentCourse ?? null);
    } catch {
      setCourse(null);
    } finally {
      setCourseLoading(false);
    }
  }

  async function fetchSectionsAndLessons() {
    try {
      setLoading(true);
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
              lessons: unwrapList<Lesson>(lessonResponse),
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
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load curriculum.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
      setSuccessMessage("Section created successfully.");
      await fetchSectionsAndLessons();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create section.");
    } finally {
      setCreatingSection(false);
    }
  }

  function startEditSection(section: Section) {
    setEditingSectionId(section.id);
    setEditSectionTitle(section.title);
    setEditSectionDescription(section.description ?? "");
  }

  async function handleUpdateSection(sectionId: string) {
    try {
      setError("");
      setSuccessMessage("");

      await instructorCourseService.updateSection(courseId, sectionId, {
        title: editSectionTitle,
        description: editSectionDescription || null,
      });

      setEditingSectionId(null);
      setSuccessMessage("Section updated successfully.");
      await fetchSectionsAndLessons();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update section.");
    }
  }

  async function handleDeleteSection(sectionId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this section?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccessMessage("");

      await instructorCourseService.deleteSection(courseId, sectionId);

      setSuccessMessage("Section deleted successfully.");
      await fetchSectionsAndLessons();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to delete section.");
    }
  }

  async function handleToggleSection(section: Section) {
    try {
      setError("");
      setSuccessMessage("");

      await instructorCourseService.changeSectionStatus(
        courseId,
        section.id,
        !section.isActive
      );

      await fetchSectionsAndLessons();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update section.");
    }
  }

  async function handleCreateLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!lessonFormSectionId) return;

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
      setSuccessMessage("Lesson created successfully.");
      await fetchSectionsAndLessons();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create lesson.");
    }
  }

  function startEditLesson(lesson: Lesson) {
    setEditingLessonId(lesson.id);
    setEditLessonTitle(lesson.title);
    setEditLessonDescription(lesson.description ?? "");
  }

  async function handleUpdateLesson(sectionId: string, lessonId: string) {
    try {
      setError("");
      setSuccessMessage("");

      await instructorCourseService.updateLesson(courseId, sectionId, lessonId, {
        title: editLessonTitle,
        description: editLessonDescription || null,
      });

      setEditingLessonId(null);
      setSuccessMessage("Lesson updated successfully.");
      await fetchSectionsAndLessons();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update lesson.");
    }
  }

  async function handleDeleteLesson(sectionId: string, lessonId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this lesson?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccessMessage("");

      await instructorCourseService.deleteLesson(courseId, sectionId, lessonId);

      setSuccessMessage("Lesson deleted successfully.");
      await fetchSectionsAndLessons();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to delete lesson.");
    }
  }

  async function handleToggleLesson(sectionId: string, lesson: Lesson) {
    try {
      setError("");
      setSuccessMessage("");

      await instructorCourseService.updateLesson(courseId, sectionId, lesson.id, {
        isActive: !lesson.isActive,
      });

      await fetchSectionsAndLessons();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update lesson.");
    }
  }

  async function handleSectionDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((section) => section.id === active.id);
    const newIndex = sections.findIndex((section) => section.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedSections = arrayMove(sections, oldIndex, newIndex);

    setSections(reorderedSections);

    try {
      await instructorCourseService.reorderSections(
        courseId,
        reorderedSections.map((section) => section.id)
      );

      await fetchSectionsAndLessons();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to reorder sections.");
      await fetchSectionsAndLessons();
    }
  }

  async function moveLesson(
    sectionId: string,
    lessonId: string,
    direction: "up" | "down"
  ) {
    const section = sections.find((item) => item.id === sectionId);
    if (!section?.lessons) return;

    const currentIndex = section.lessons.findIndex(
      (lesson) => lesson.id === lessonId
    );
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= section.lessons.length) return;

    const copiedLessons = [...section.lessons];
    const temp = copiedLessons[currentIndex];
    copiedLessons[currentIndex] = copiedLessons[targetIndex];
    copiedLessons[targetIndex] = temp;

    setSections((prev) =>
      prev.map((item) =>
        item.id === sectionId ? { ...item, lessons: copiedLessons } : item
      )
    );

    try {
      await instructorCourseService.reorderLessons(
        courseId,
        sectionId,
        copiedLessons.map((lesson) => lesson.id)
      );

      await fetchSectionsAndLessons();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to reorder lessons.");
      await fetchSectionsAndLessons();
    }
  }

  function handleSelectLessonFile(sectionId: string, lesson: Lesson, file: File) {
    const mediaType = getMediaType(file);
    const previewUrl =
      file.type.startsWith("image/") || file.type.startsWith("video/")
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

    const { sectionId, lesson, file } = pendingUpload;

    try {
      setUploading({
        lessonId: lesson.id,
        progressText: "Getting upload signature...",
      });
      setError("");
      setSuccessMessage("");

      const resourceType = getCloudinaryResourceType(file);
      const mediaType = getMediaType(file);

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
          type: mediaType,
          filename: file.name,
          mimeType: file.type || null,
          sizeInBytes: file.size,
        }
      );

      const savedMedia = unwrapData<LessonFileMedia>(mediaResponse);

      setUploadedFiles((prev) => ({
        ...prev,
        [lesson.id]: [...(prev[lesson.id] ?? []), savedMedia],
      }));

      if (pendingUpload.previewUrl) {
        URL.revokeObjectURL(pendingUpload.previewUrl);
      }

      setPendingUpload(null);
      setSuccessMessage("Lesson media uploaded successfully.");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to upload lesson media."
      );
    } finally {
      setUploading(null);
    }
  }

  useEffect(() => {
    fetchCurrentCourse();
    fetchSectionsAndLessons();

    return () => {
      if (pendingUpload?.previewUrl) {
        URL.revokeObjectURL(pendingUpload.previewUrl);
      }
    };
  }, [courseId]);

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
                      ? `${course.price}`
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

      {error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {Array.isArray(error) ? error.join(", ") : error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {successMessage}
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
              disabled={!canEditDraft}
            />

            <Textarea
              value={sectionDescription}
              onChange={(event) => setSectionDescription(event.target.value)}
              placeholder="Section description"
              maxLength={1000}
              disabled={!canEditDraft}
            />

            <Button type="submit" disabled={creatingSection || !canEditDraft}>
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
                <SortableSectionCard key={section.id} section={section}>
                  <CardHeader>
                    {editingSectionId === section.id ? (
                      <div className="space-y-3">
                        <Input
                          value={editSectionTitle}
                          onChange={(event) =>
                            setEditSectionTitle(event.target.value)
                          }
                          disabled={!canEditDraft}
                        />

                        <Textarea
                          value={editSectionDescription}
                          onChange={(event) =>
                            setEditSectionDescription(event.target.value)
                          }
                          disabled={!canEditDraft}
                        />

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateSection(section.id)}
                            disabled={!canEditDraft}
                          >
                            <Save className="mr-2 h-4 w-4" />
                            Save
                          </Button>

                          <Button
                            size="sm"
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
                            variant="outline"
                            onClick={() => handleToggleSection(section)}
                            disabled={!canEditDraft}
                          >
                            {section.isActive ? "Disable" : "Enable"}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditSection(section)}
                            disabled={!canEditDraft}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteSection(section.id)}
                            disabled={!canEditDraft}
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
                          (lesson: Lesson, lessonIndex: number) => (
                            <div
                              key={lesson.id}
                              className="rounded-xl border bg-background p-4"
                            >
                              {editingLessonId === lesson.id ? (
                                <div className="space-y-3">
                                  <Input
                                    value={editLessonTitle}
                                    onChange={(event) =>
                                      setEditLessonTitle(event.target.value)
                                    }
                                    disabled={!canEditDraft}
                                  />

                                  <Textarea
                                    value={editLessonDescription}
                                    onChange={(event) =>
                                      setEditLessonDescription(
                                        event.target.value
                                      )
                                    }
                                    disabled={!canEditDraft}
                                  />

                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleUpdateLesson(
                                          section.id,
                                          lesson.id
                                        )
                                      }
                                      disabled={!canEditDraft}
                                    >
                                      Save
                                    </Button>

                                    <Button
                                      size="sm"
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
                                        variant="outline"
                                        disabled={
                                          lessonIndex === 0 || !canEditDraft
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
                                        variant="outline"
                                        disabled={
                                          lessonIndex ===
                                            (section.lessons?.length ?? 0) -
                                              1 || !canEditDraft
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
                                        variant="outline"
                                        onClick={() =>
                                          handleToggleLesson(
                                            section.id,
                                            lesson
                                          )
                                        }
                                        disabled={!canEditDraft}
                                      >
                                        {lesson.isActive
                                          ? "Disable"
                                          : "Enable"}
                                      </Button>

                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => startEditLesson(lesson)}
                                        disabled={!canEditDraft}
                                      >
                                        Edit
                                      </Button>

                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() =>
                                          handleDeleteLesson(
                                            section.id,
                                            lesson.id
                                          )
                                        }
                                        disabled={!canEditDraft}
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="rounded-lg border bg-muted/30 p-3">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                      <div>
                                        <p className="text-sm font-medium">
                                          Lesson Media
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          Choose a video, image, PDF, or raw file
                                          and preview before uploading.
                                        </p>
                                      </div>

                                      <label className="inline-flex cursor-pointer items-center justify-center rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted">
                                        <FileUp className="mr-2 h-4 w-4" />
                                        Select Media
                                        <input
                                          type="file"
                                          className="hidden"
                                          disabled={
                                            !canEditDraft ||
                                            uploading?.lessonId === lesson.id
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

                                    {uploading?.lessonId === lesson.id && (
                                      <p className="mt-2 text-xs text-blue-600">
                                        {uploading.progressText}
                                      </p>
                                    )}

                                    {uploadedFiles[lesson.id]?.length ? (
                                      <div className="mt-3 space-y-2">
                                        {uploadedFiles[lesson.id].map(
                                          (file) => (
                                            <a
                                              key={file.id}
                                              href={file.url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="block rounded-md border bg-white px-3 py-2 text-sm hover:bg-zinc-50"
                                            >
                                              <span className="font-medium">
                                                {file.filename ||
                                                  "Uploaded file"}
                                              </span>
                                              <span className="ml-2 text-xs text-zinc-500">
                                                {file.type}
                                              </span>
                                            </a>
                                          )
                                        )}
                                      </div>
                                    ) : (
                                      <p className="mt-2 text-xs text-muted-foreground">
                                        Newly uploaded files will appear here.
                                        Existing lesson files need a GET files
                                        API to load them from backend.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
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
                        className="space-y-3 rounded-lg border bg-muted/40 p-4"
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
                          disabled={!canEditDraft}
                        />

                        <Textarea
                          value={lessonDescription}
                          onChange={(event) =>
                            setLessonDescription(event.target.value)
                          }
                          placeholder="Lesson description"
                          maxLength={2000}
                          disabled={!canEditDraft}
                        />

                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            size="sm"
                            disabled={!canEditDraft}
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
                        variant="outline"
                        onClick={() => setLessonFormSectionId(section.id)}
                        disabled={!canEditDraft}
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
                    This file cannot be previewed directly. It will be uploaded
                    as {pendingUpload.mediaType}.
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
                  <span className="font-medium text-zinc-900">Type:</span>{" "}
                  {pendingUpload.file.type || "Unknown"}
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
                disabled={Boolean(uploading)}
              >
                {uploading ? "Uploading..." : "Confirm Upload"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}