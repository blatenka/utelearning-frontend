"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  FileUp,
  Save,
  Send,
  Trash2,
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
  UploadSignatureResponse,
} from "@/services/instructor-course.service";

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

async function uploadImageToCloudinary(
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
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
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

  const [loading, setLoading] = useState(false);
  const [savingCourse, setSavingCourse] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [deletingDraft, setDeletingDraft] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

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
  const [thumbnailUrl, setThumbnailUrl] = useState("");

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
    setThumbnailUrl(currentCourse.thumbnailUrl ?? "");
  }

  async function fetchCourse() {
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

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

  async function handleUploadThumbnail(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Thumbnail must be an image file.");
      return;
    }

    try {
      setUploadingThumbnail(true);
      setError("");
      setSuccessMessage("");

      const signatureResponse =
        await instructorCourseService.getUploadSignature({
          entityType: "course",
          entityId: courseId,
          resourceType: "image",
          subFolder: "thumbnail",
        });

      const signature = unwrapData<UploadSignatureResponse>(signatureResponse);
      const cloudinaryResult = await uploadImageToCloudinary(file, signature);

      setThumbnailUrl(cloudinaryResult.secure_url);
      setSuccessMessage(
        "Thumbnail uploaded. Click Save Course to update the course."
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to upload thumbnail."
      );
    } finally {
      setUploadingThumbnail(false);
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
        thumbnailUrl: thumbnailUrl || undefined,
      };

      const response = await instructorCourseService.updateCourse(
        courseId,
        payload
      );

      const updatedCourse = unwrapData<InstructorCourse>(response);

      if (updatedCourse?.id) {
        setCourse(updatedCourse);
        fillCourseForm(updatedCourse);
      } else {
        await fetchCourse();
      }

      setSuccessMessage("Course information saved successfully.");
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

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
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
            Update basic course information and thumbnail.
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
            onClick={() => router.push(`/instructor/courses/${courseId}/curriculum`)}
          >
            Manage Curriculum
          </Button>

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
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle>Course Information</CardTitle>
              <CardDescription>
                These fields update only the basic course information.
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

          <section className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Thumbnail</CardTitle>
                <CardDescription>
                  Upload the main image shown on course cards and detail page.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt={title || "Course thumbnail"}
                      className="h-48 w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center rounded-lg bg-zinc-100 text-sm text-zinc-400">
                      No thumbnail
                    </div>
                  )}

                  <label className="flex cursor-pointer items-center justify-center rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted">
                    <FileUp className="mr-2 h-4 w-4" />
                    {uploadingThumbnail ? "Uploading..." : "Upload Thumbnail"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={!canEditDraft || uploadingThumbnail}
                      onChange={(event) => {
                        const file = event.target.files?.[0];

                        if (file) {
                          handleUploadThumbnail(file);
                        }

                        event.target.value = "";
                      }}
                    />
                  </label>

                  <p className="text-xs text-zinc-500">
                    After uploading, click Save Course to store the thumbnail
                    URL in backend.
                  </p>
                </div>
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
                  <div>
                    <h2 className="font-semibold text-zinc-900">
                      {title || course?.title || "Untitled course"}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      {shortDescription ||
                        course?.shortDescription ||
                        "No short description."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {level && <Badge>{level}</Badge>}
                    {course?.status && (
                      <Badge variant="outline">{course.status}</Badge>
                    )}
                    {language && <Badge variant="secondary">{language}</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </main>
  );
}