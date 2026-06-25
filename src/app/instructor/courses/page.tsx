"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Edit,
  Layers,
  MessageSquareText,
  PlusCircle,
  Trash2,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  instructorCourseService,
  InstructorCourse,
  unwrapList,
} from "@/services/instructor-course.service";
import RoleGuard from "@/components/RoleGuard";

type AlertModalState = {
  open: boolean;
  title: string;
  message: string;
  variant: "success" | "error";
};

type InstructorCourseLatestReview = {
  reviewId: string;
  courseId: string;
  courseStatus: string;
  reviewStatus: string;
  reviewNote?: string | null;
  submittedAt: string | Date;
  reviewedAt?: string | Date | null;
};

type ReviewModalState = {
  open: boolean;
  loading: boolean;
  courseTitle: string;
  review: InstructorCourseLatestReview | null;
};

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

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shouldHighlightReview(course: InstructorCourse) {
  const status = String(course.status || "").toUpperCase();

  return [
    "CHANGES_REQUESTED",
    "REJECTED",
    "NEEDS_REVISION",
    "REVISION_REQUIRED",
  ].includes(status);
}

function getStatusBadgeVariant(status?: string) {
  const normalizedStatus = String(status || "").toUpperCase();

  if (normalizedStatus === "APPROVED" || normalizedStatus === "PUBLISHED") {
    return "default" as const;
  }

  if (
    normalizedStatus === "REJECTED" ||
    normalizedStatus === "CHANGES_REQUESTED"
  ) {
    return "destructive" as const;
  }

  return "secondary" as const;
}

export default function InstructorCoursesPage() {
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [courseToDelete, setCourseToDelete] =
    useState<InstructorCourse | null>(null);

  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadingReviewId, setLoadingReviewId] = useState<string | null>(null);

  const [alertModal, setAlertModal] = useState<AlertModalState>({
    open: false,
    title: "",
    message: "",
    variant: "success",
  });

  const [reviewModal, setReviewModal] = useState<ReviewModalState>({
    open: false,
    loading: false,
    courseTitle: "",
    review: null,
  });

  const closeAlertModal = () => {
    setAlertModal({
      open: false,
      title: "",
      message: "",
      variant: "success",
    });
  };

  const closeReviewModal = () => {
    if (reviewModal.loading) return;

    setReviewModal({
      open: false,
      loading: false,
      courseTitle: "",
      review: null,
    });
  };

  const showSuccessModal = (message: string, title = "Success") => {
    setAlertModal({
      open: true,
      title,
      message,
      variant: "success",
    });
  };

  const showErrorModal = (message: string, title = "Error") => {
    setAlertModal({
      open: true,
      title,
      message,
      variant: "error",
    });
  };

  async function fetchCourses() {
    try {
      setLoading(true);

      const response = await instructorCourseService.getMyCourses({
        page: 1,
        limit: 20,
        sortField: "updatedAt",
        sortDirection: "desc",
      });

      setCourses(unwrapList<InstructorCourse>(response));
    } catch (err) {
      showErrorModal(getErrorMessage(err, "Failed to load instructor courses."));
    } finally {
      setLoading(false);
    }
  }

  async function handleViewLatestReview(course: InstructorCourse) {
    try {
      setLoadingReviewId(course.id);

      setReviewModal({
        open: true,
        loading: true,
        courseTitle: course.title,
        review: null,
      });

      const response = await api.get(
        `/v1/instructor/courses/${course.id}/reviews/latest`
      );

      const latestReview =
        response.data?.data || response.data || null;

      setReviewModal({
        open: true,
        loading: false,
        courseTitle: course.title,
        review: latestReview,
      });
    } catch (err) {
      setReviewModal({
        open: false,
        loading: false,
        courseTitle: "",
        review: null,
      });

      showErrorModal(
        getErrorMessage(
          err,
          "No latest reviewer feedback found for this course."
        ),
        "Reviewer feedback"
      );
    } finally {
      setLoadingReviewId(null);
    }
  }

  async function confirmDeleteDraft() {
    if (!courseToDelete) return;

    try {
      setDeletingId(courseToDelete.id);

      await instructorCourseService.deleteDraftCourse(courseToDelete.id);

      setCourses((prev) =>
        prev.filter((course) => course.id !== courseToDelete.id)
      );

      setCourseToDelete(null);
      showSuccessModal("Draft course deleted successfully.");
    } catch (err) {
      showErrorModal(getErrorMessage(err, "Failed to delete draft course."));
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    fetchCourses();
  }, []);

  const getAlertIconStyle = () => {
    if (alertModal.variant === "success") {
      return "bg-green-100 text-green-700";
    }

    return "bg-red-100 text-red-700";
  };

  const getAlertButtonStyle = () => {
    if (alertModal.variant === "success") {
      return "bg-green-600 hover:bg-green-700";
    }

    return "bg-red-600 hover:bg-red-700";
  };

  const getAlertIcon = () => {
    if (alertModal.variant === "success") {
      return "✓";
    }

    return "!";
  };

  return (
    <RoleGuard allowedRoles={["INSTRUCTOR"]}>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Courses</h1>
            <p className="text-muted-foreground">
              Manage your draft and published courses.
            </p>
          </div>

          <Button asChild>
            <Link href="/instructor/courses/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Course
            </Link>
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading courses...</p>
        ) : courses.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No courses yet</CardTitle>
              <CardDescription>
                Create your first draft course and start building sections,
                lessons, and assessments.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Button asChild>
                <Link href="/instructor/courses/new">Create Course</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {courses.map((course) => {
              const hasReviewAttention = shouldHighlightReview(course);

              return (
                <Card
                  key={course.id}
                  className={
                    hasReviewAttention
                      ? "border-yellow-300 bg-yellow-50/40"
                      : undefined
                  }
                >
                  <CardHeader>
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <CardTitle>{course.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {course.shortDescription || "No short description"}
                        </CardDescription>

                        {hasReviewAttention && (
                          <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-100 px-3 py-2 text-sm text-yellow-800">
                            Reviewer has requested changes. Open feedback before
                            editing this course.
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {course.status && (
                          <Badge variant={getStatusBadgeVariant(course.status)}>
                            {course.status}
                          </Badge>
                        )}

                        {course.level && (
                          <Badge variant="outline">{course.level}</Badge>
                        )}

                        {course.isActive === false && (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="text-sm text-muted-foreground">
                        {course.language && <span>{course.language}</span>}

                        {typeof course.price === "number" && (
                          <span className="ml-3">
                            {formatCurrency(course.price)}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant={hasReviewAttention ? "default" : "outline"}
                          size="sm"
                          disabled={loadingReviewId === course.id}
                          onClick={() => handleViewLatestReview(course)}
                        >
                          <MessageSquareText className="mr-2 h-4 w-4" />
                          {loadingReviewId === course.id
                            ? "Loading..."
                            : hasReviewAttention
                            ? "View Feedback"
                            : "Review Note"}
                        </Button>

                        <Button asChild variant="outline" size="sm">
                          <Link href={`/instructor/courses/${course.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>

                        <Button asChild variant="outline" size="sm">
                          <Link
                            href={`/instructor/courses/${course.id}/curriculum`}
                          >
                            <Layers className="mr-2 h-4 w-4" />
                            Curriculum
                          </Link>
                        </Button>

                        <Button asChild size="sm">
                          <Link
                            href={`/instructor/courses/${course.id}/assessments`}
                          >
                            <ClipboardList className="mr-2 h-4 w-4" />
                            Assessments
                          </Link>
                        </Button>

                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deletingId === course.id}
                          onClick={() => setCourseToDelete(course)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {deletingId === course.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {courseToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-xl border bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-xl font-bold text-red-700">
                !
              </div>

              <h2 className="text-lg font-semibold">Delete draft course?</h2>

              <p className="mt-2 text-sm text-zinc-500">
                This action will delete the draft course. You cannot undo this
                action.
              </p>

              <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
                <p className="font-medium">{courseToDelete.title}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {courseToDelete.shortDescription || "No short description"}
                </p>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={deletingId === courseToDelete.id}
                  onClick={() => setCourseToDelete(null)}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  disabled={deletingId === courseToDelete.id}
                  onClick={confirmDeleteDraft}
                >
                  {deletingId === courseToDelete.id
                    ? "Deleting..."
                    : "Delete course"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {reviewModal.open && (
          <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-2xl rounded-xl border bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
                <MessageSquareText className="h-6 w-6" />
              </div>

              <h2 className="text-lg font-semibold">Latest reviewer feedback</h2>

              <p className="mt-1 text-sm text-zinc-500">
                {reviewModal.courseTitle}
              </p>

              {reviewModal.loading ? (
                <div className="mt-5 rounded-lg bg-zinc-50 p-4 text-sm text-zinc-500 dark:bg-zinc-900">
                  Loading reviewer feedback...
                </div>
              ) : reviewModal.review ? (
                <div className="mt-5 space-y-4">
                  <div className="grid gap-3 rounded-lg border bg-zinc-50 p-4 text-sm dark:bg-zinc-900 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase text-zinc-500">
                        Course status
                      </p>
                      <p className="mt-1 font-medium">
                        {reviewModal.review.courseStatus || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase text-zinc-500">
                        Review status
                      </p>
                      <p className="mt-1 font-medium">
                        {reviewModal.review.reviewStatus || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase text-zinc-500">
                        Submitted at
                      </p>
                      <p className="mt-1 font-medium">
                        {formatDateTime(reviewModal.review.submittedAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase text-zinc-500">
                        Reviewed at
                      </p>
                      <p className="mt-1 font-medium">
                        {formatDateTime(reviewModal.review.reviewedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                    <p className="text-sm font-semibold text-yellow-900">
                      Reviewer note
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-yellow-900">
                      {reviewModal.review.reviewNote?.trim() ||
                        "Reviewer did not leave a note."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-lg bg-zinc-50 p-4 text-sm text-zinc-500 dark:bg-zinc-900">
                  No reviewer feedback found.
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                {reviewModal.review?.courseId && (
                  <>
                    <Button asChild variant="outline">
                      <Link
                        href={`/instructor/courses/${reviewModal.review.courseId}/edit`}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Course
                      </Link>
                    </Button>

                    <Button asChild variant="outline">
                      <Link
                        href={`/instructor/courses/${reviewModal.review.courseId}/curriculum`}
                      >
                        <Layers className="mr-2 h-4 w-4" />
                        Open Curriculum
                      </Link>
                    </Button>
                  </>
                )}

                <Button
                  type="button"
                  disabled={reviewModal.loading}
                  onClick={closeReviewModal}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {alertModal.open && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-xl border bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold ${getAlertIconStyle()}`}
              >
                {getAlertIcon()}
              </div>

              <h2 className="text-lg font-semibold">{alertModal.title}</h2>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                {alertModal.message}
              </p>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={closeAlertModal}
                  className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${getAlertButtonStyle()}`}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </RoleGuard>
  );
}