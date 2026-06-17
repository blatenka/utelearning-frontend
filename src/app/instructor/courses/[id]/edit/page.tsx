"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Edit,
  FileUp,
  PlusCircle,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";

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
  CourseLevel,
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

const courseLevels: CourseLevel[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

function linesToArray(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function arrayToLines(value?: string[]) {
  return Array.isArray(value) ? value.join("\n") : "";
}

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

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/${signature.resourceType}/upload`,
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

export default function InstructorCourseEditPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = String(params.id);

  const [course, setCourse] = useState<InstructorCourse | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<
    Record<string, LessonFileMedia[]>
  >({});

  const [loading, setLoading] = useState(false);
  const [savingCourse, setSavingCourse] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [deletingDraft, setDeletingDraft] = useState(false);
  const [uploading, setUploading] = useState<UploadingState>(null);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [whatYouWillLearn, setWhatYouWillLearn] = useState("");
  const [requirements, setRequirements] = useState("");
  const [level, setLevel] = useState<CourseLevel>("BEGINNER");
  const [price, setPrice] = useState("");
  const [language, setLanguage] = useState("");
  const [certificateEnabled, setCertificateEnabled] = useState(false);

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

  const canEditDraft = useMemo(() => {
    const status = course?.status?.toUpperCase();

    return !status || status === "DRAFT" || status === "NEEDS_CHANGES";
  }, [course?.status]);

  function fillCourseForm(currentCourse: InstructorCourse) {
    setTitle(currentCourse.title ?? "");
    setShortDescription(currentCourse.shortDescription ?? "");
    setDescription(currentCourse.description ?? "");
    setWhatYouWillLearn(arrayToLines(currentCourse.whatYouWillLearn));
    setRequirements(arrayToLines(currentCourse.requirements));
    setLevel(currentCourse.level ?? "BEGINNER");
    setPrice(
      typeof currentCourse.price === "number" ? String(currentCourse.price) : ""
    );
    setLanguage(currentCourse.language ?? "");
    setCertificateEnabled(Boolean(currentCourse.certificateEnabled));
  }

  async function fetchCourse() {
    const response = await instructorCourseService.getMyCourses({
      page: 1,
      limit: 100,
    });

    const courseList = unwrapList<InstructorCourse>(response);
    const currentCourse = courseList.find((item) => item.id === courseId);

    if (!currentCourse) {
      throw new Error("Course not found in your instructor course list.");
    }

    setCourse(currentCourse);
    fillCourseForm(currentCourse);
  }

  async function fetchSectionsAndLessons() {
    const sectionResponse = await instructorCourseService.getSections(courseId, {
      sortField: "sectionIndex",
      sortDirection: "asc",
      limit: 100,
    });

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
  }

  async function fetchPageData() {
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      await Promise.all([fetchCourse(), fetchSectionsAndLessons()]);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load course edit page."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSavingCourse(true);
      setError("");
      setSuccessMessage("");

      const payload = {
        title,
        shortDescription,
        description: description || undefined,
        whatYouWillLearn: linesToArray(whatYouWillLearn),
        requirements: linesToArray(requirements),
        level,
        price: price === "" ? undefined : Number(price),
        language: language || undefined,
        certificateEnabled,
      };

      const response = await instructorCourseService.updateCourse(
        courseId,
        payload
      );

      const updatedCourse = unwrapData<InstructorCourse>(response);
      setCourse(updatedCourse?.id ? updatedCourse : course);

      setSuccessMessage("Course information saved successfully.");
      await fetchCourse();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save course.");
    } finally {
      setSavingCourse(false);
    }
  }

  async function handleSubmitForReview() {
    const confirmed = window.confirm(
      "Submit this draft course for review? You may not be able to edit it after submitting."
    );

    if (!confirmed) return;

    try {
      setSubmittingReview(true);
      setError("");
      setSuccessMessage("");

      await instructorCourseService.submitForReview(courseId);

      setSuccessMessage("Course submitted for review successfully.");
      await fetchCourse();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to submit for review.");
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleDeleteDraft() {
    const confirmed = window.confirm(
      "Delete this draft course? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setDeletingDraft(true);
      setError("");

      await instructorCourseService.deleteDraftCourse(courseId);

      router.push("/instructor/courses");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to delete draft course.");
    } finally {
      setDeletingDraft(false);
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
    const confirmed = window.confirm("Delete this section?");
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
    const confirmed = window.confirm("Delete this lesson?");
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

  async function handleUploadLessonFile(
    sectionId: string,
    lesson: Lesson,
    file: File
  ) {
    try {
      setUploading({
        lessonId: lesson.id,
        progressText: "Getting upload signature...",
      });
      setError("");
      setSuccessMessage("");

      const resourceType = getCloudinaryResourceType(file);
      const mediaType = getMediaType(file);

      const signatureResponse = await instructorCourseService.getUploadSignature({
        entityType: "lesson",
        entityId: lesson.id,
        resourceType,
        subFolder: "files",
        publicId: `${lesson.id}_${Date.now()}`,
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
    fetchPageData();
  }, [courseId]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push("/instructor/courses")}
            className="mb-3 inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to my courses
          </button>

          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Edit Course
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Update draft course information, manage curriculum, and upload
            lesson media.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {course?.status && (
            <Badge variant="outline" className="px-3 py-1 text-sm">
              {course.status}
            </Badge>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={handleSubmitForReview}
            disabled={!course || submittingReview || !canEditDraft}
          >
            <Send className="mr-2 h-4 w-4" />
            {submittingReview ? "Submitting..." : "Submit for Review"}
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={handleDeleteDraft}
            disabled={!course || deletingDraft || !canEditDraft}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deletingDraft ? "Deleting..." : "Delete Draft"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {Array.isArray(error) ? error.join(", ") : error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {successMessage}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading course...</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Information</CardTitle>
                <CardDescription>
                  These fields update the draft course.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSaveCourse} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Title
                    </label>
                    <Input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      minLength={3}
                      maxLength={255}
                      required
                      disabled={!canEditDraft}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Short Description
                    </label>
                    <Textarea
                      value={shortDescription}
                      onChange={(event) =>
                        setShortDescription(event.target.value)
                      }
                      minLength={10}
                      maxLength={500}
                      required
                      disabled={!canEditDraft}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Description
                    </label>
                    <Textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      maxLength={10000}
                      rows={5}
                      disabled={!canEditDraft}
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Level
                      </label>
                      <select
                        value={level}
                        onChange={(event) =>
                          setLevel(event.target.value as CourseLevel)
                        }
                        disabled={!canEditDraft}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {courseLevels.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Price
                      </label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={price}
                        onChange={(event) => setPrice(event.target.value)}
                        disabled={!canEditDraft}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Language
                    </label>
                    <Input
                      value={language}
                      onChange={(event) => setLanguage(event.target.value)}
                      placeholder="English, Vietnamese..."
                      maxLength={50}
                      disabled={!canEditDraft}
                    />
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={certificateEnabled}
                      onChange={(event) =>
                        setCertificateEnabled(event.target.checked)
                      }
                      disabled={!canEditDraft}
                    />
                    Certificate enabled
                  </label>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      What students will learn
                    </label>
                    <Textarea
                      value={whatYouWillLearn}
                      onChange={(event) =>
                        setWhatYouWillLearn(event.target.value)
                      }
                      placeholder="One item per line"
                      rows={5}
                      disabled={!canEditDraft}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Requirements
                    </label>
                    <Textarea
                      value={requirements}
                      onChange={(event) => setRequirements(event.target.value)}
                      placeholder="One item per line"
                      rows={4}
                      disabled={!canEditDraft}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={savingCourse || !canEditDraft}
                    className="w-full"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {savingCourse ? "Saving..." : "Save Course"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Course Preview</CardTitle>
                <CardDescription>
                  Quick overview of the current course.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {course?.thumbnailUrl ? (
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="h-40 w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-lg bg-zinc-100 text-sm text-zinc-400">
                      No thumbnail
                    </div>
                  )}

                  <div>
                    <h2 className="font-semibold text-zinc-900">
                      {course?.title || "Untitled course"}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      {course?.shortDescription || "No short description."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {course?.level && <Badge>{course.level}</Badge>}
                    {course?.status && (
                      <Badge variant="outline">{course.status}</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Section</CardTitle>
                <CardDescription>
                  Create sections before adding lessons and media.
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
                    onChange={(event) =>
                      setSectionDescription(event.target.value)
                    }
                    placeholder="Section description"
                    maxLength={1000}
                    disabled={!canEditDraft}
                  />

                  <Button
                    type="submit"
                    disabled={creatingSection || !canEditDraft}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {creatingSection ? "Creating..." : "Add Section"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {sections.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No sections yet</CardTitle>
                  <CardDescription>
                    Create your first section to start building the curriculum.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <div className="space-y-5">
                {sections.map((section, sectionIndex) => (
                  <Card key={section.id}>
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
                                        onClick={() =>
                                          setEditingLessonId(null)
                                        }
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
                                          onClick={() =>
                                            startEditLesson(lesson)
                                          }
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
                                            Upload video, image, PDF, or other
                                            lesson material.
                                          </p>
                                        </div>

                                        <label className="inline-flex cursor-pointer items-center justify-center rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted">
                                          <FileUp className="mr-2 h-4 w-4" />
                                          Upload Media
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
                                                handleUploadLessonFile(
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
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}