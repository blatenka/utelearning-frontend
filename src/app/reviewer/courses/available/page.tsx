"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import {
  reviewerCourseService,
  unwrapList,
} from "@/services/review.service";
import RoleGuard from "@/components/RoleGuard";

type CourseCategorySummary = {
  id: string;
  name: string;
  slug?: string | null;
};

type CourseInstructorSummary = {
  id: string;
  fullName: string;
  email?: string | null;
  avatarUrl?: string | null;
};

type CourseResponseDto = {
  id: string;
  title: string;
  slug?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  level?: string | null;
  language?: string | null;
  price?: number | null;
  status?: string;
  isActive?: boolean;
  submittedAt?: string | null;
  updatedAt?: string | null;
  categories?: CourseCategorySummary[];
  instructors?: CourseInstructorSummary[];
};

type AlertModalState = {
  open: boolean;
  title: string;
  message: string;
  variant: "success" | "error" | "info" | "warning";
};

function getCourseTitle(course: CourseResponseDto) {
  return course.title || "Untitled course";
}

function getCourseDescription(course: CourseResponseDto) {
  return course.shortDescription || "No short description.";
}

function getCourseThumbnail(course: CourseResponseDto) {
  return course.thumbnailUrl || "";
}

function getCourseLevel(course: CourseResponseDto) {
  return course.level || "";
}

function getCourseCategories(course: CourseResponseDto) {
  return course.categories || [];
}

function getCourseInstructors(course: CourseResponseDto) {
  return course.instructors || [];
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

function formatDateTime(value?: string | null) {
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

export default function ReviewerAvailableCoursesPage() {
  const [courses, setCourses] = useState<CourseResponseDto[]>([]);
  const [courseToClaim, setCourseToClaim] =
    useState<CourseResponseDto | null>(null);

  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [alertModal, setAlertModal] = useState<AlertModalState>({
    open: false,
    title: "",
    message: "",
    variant: "info",
  });

  const filteredCourses = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return courses;

    return courses.filter((course) =>
      `${getCourseTitle(course)} ${getCourseDescription(course)}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [courses, search]);

  const closeAlertModal = () => {
    setAlertModal({
      open: false,
      title: "",
      message: "",
      variant: "info",
    });
  };

  const showModal = (
    title: string,
    message: string,
    variant: AlertModalState["variant"] = "info"
  ) => {
    setAlertModal({
      open: true,
      title,
      message,
      variant,
    });
  };

  const closeClaimModal = () => {
    if (claimingId) return;
    setCourseToClaim(null);
  };

  async function fetchAvailableCourses() {
    try {
      setLoading(true);

      const response = await reviewerCourseService.getAvailableCourses({
        page: 1,
        limit: 30,
      });

      const list = unwrapList<CourseResponseDto>(response);

      setCourses(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Load available courses error:", err);

      showModal(
        "Failed to load available courses",
        getErrorMessage(err, "Failed to load available courses."),
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  async function confirmClaimCourse() {
    if (!courseToClaim) return;

    const courseId = courseToClaim.id;

    if (!courseId) {
      setCourseToClaim(null);
      showModal(
        "Cannot claim course",
        "Cannot claim this course because course id is missing.",
        "error"
      );
      return;
    }

    try {
      setClaimingId(courseId);

      await reviewerCourseService.claimCourse(courseId);

      setCourses((prev) => prev.filter((item) => item.id !== courseId));
      setCourseToClaim(null);

      showModal(
        "Course claimed successfully",
        "You can find this course in My Review Tasks.",
        "success"
      );
    } catch (err) {
      console.error("Claim course error:", err);

      showModal(
        "Failed to claim course",
        getErrorMessage(err, "Failed to claim course."),
        "error"
      );
    } finally {
      setClaimingId(null);
    }
  }

  function getAlertIconStyle() {
    if (alertModal.variant === "success") {
      return "bg-green-100 text-green-700";
    }

    if (alertModal.variant === "error") {
      return "bg-red-100 text-red-700";
    }

    if (alertModal.variant === "warning") {
      return "bg-yellow-100 text-yellow-700";
    }

    return "bg-blue-100 text-blue-700";
  }

  function getAlertButtonStyle() {
    if (alertModal.variant === "success") {
      return "bg-green-600 hover:bg-green-700";
    }

    if (alertModal.variant === "error") {
      return "bg-red-600 hover:bg-red-700";
    }

    if (alertModal.variant === "warning") {
      return "bg-yellow-600 hover:bg-yellow-700";
    }

    return "bg-blue-600 hover:bg-blue-700";
  }

  function getAlertIcon() {
    if (alertModal.variant === "success") {
      return <CheckCircle2 className="h-6 w-6" />;
    }

    if (alertModal.variant === "error") {
      return <XCircle className="h-6 w-6" />;
    }

    if (alertModal.variant === "warning") {
      return <AlertTriangle className="h-6 w-6" />;
    }

    return <Info className="h-6 w-6" />;
  }

  useEffect(() => {
    fetchAvailableCourses();
  }, []);

  return (
    <RoleGuard allowedRoles={["REVIEWER"]}>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
              Available Courses
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Claim unassigned courses that match your authorized categories.
            </p>
          </div>

          <Link
            href="/reviewer/courses"
            className="inline-flex rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            My Review Tasks
          </Link>
        </div>

        <div className="mb-5">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search available courses..."
            className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500">Loading available courses...</p>
        ) : filteredCourses.length === 0 ? (
          <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">
              No available courses
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              There are no unclaimed courses available for your categories right
              now.
            </p>
          </div>
        ) : (
          <div className="grid gap-5">
            {filteredCourses.map((course) => {
              const courseId = course.id;
              const title = getCourseTitle(course);
              const description = getCourseDescription(course);
              const thumbnailUrl = getCourseThumbnail(course);
              const level = getCourseLevel(course);
              const categories = getCourseCategories(course);
              const instructors = getCourseInstructors(course);

              return (
                <div
                  key={courseId}
                  className="overflow-hidden rounded-2xl border bg-white shadow-sm"
                >
                  <div className="grid gap-4 p-5 md:grid-cols-[180px_1fr]">
                    <div className="h-36 overflow-hidden rounded-xl bg-zinc-100">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">
                          No thumbnail
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h2 className="text-xl font-semibold text-zinc-900">
                            {title}
                          </h2>
                          <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                            {description}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setCourseToClaim(course)}
                          disabled={claimingId === courseId}
                          className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {claimingId === courseId ? "Claiming..." : "Claim"}
                        </button>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {level && (
                          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                            {level}
                          </span>
                        )}

                        {course.language && (
                          <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                            {course.language}
                          </span>
                        )}

                        {categories.map((category) => (
                          <span
                            key={category.id}
                            className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                          >
                            {category.name}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 text-sm text-zinc-500">
                        {instructors.length > 0 ? (
                          <p>
                            Instructor:{" "}
                            <span className="font-medium text-zinc-700">
                              {instructors
                                .map((instructor) => instructor.fullName)
                                .join(", ")}
                            </span>
                          </p>
                        ) : (
                          <p>Instructor: Not available</p>
                        )}

                        {course.submittedAt && (
                          <p className="mt-1">
                            Submitted at: {formatDateTime(course.submittedAt)}
                          </p>
                        )}

                        {course.updatedAt && (
                          <p className="mt-1">
                            Updated at: {formatDateTime(course.updatedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {courseToClaim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-yellow-700">
                <AlertTriangle className="h-6 w-6" />
              </div>

              <h2 className="text-lg font-semibold text-zinc-900">
                Claim this course?
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-600">
                After claiming this course, it will move to your review tasks.
                You should only claim it when you are ready to review.
              </p>

              <div className="mt-4 rounded-xl border bg-zinc-50 p-4">
                <p className="font-medium text-zinc-900">
                  {getCourseTitle(courseToClaim)}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                  {getCourseDescription(courseToClaim)}
                </p>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeClaimModal}
                  disabled={claimingId === courseToClaim.id}
                  className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmClaimCourse}
                  disabled={claimingId === courseToClaim.id}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {claimingId === courseToClaim.id
                    ? "Claiming..."
                    : "Confirm Claim"}
                </button>
              </div>
            </div>
          </div>
        )}

        {alertModal.open && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl">
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${getAlertIconStyle()}`}
              >
                {getAlertIcon()}
              </div>

              <h2 className="text-lg font-semibold text-zinc-900">
                {alertModal.title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-600">
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