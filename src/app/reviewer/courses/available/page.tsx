"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
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

export default function ReviewerAvailableCoursesPage() {
  const { user } = useAuth();

  const [courses, setCourses] = useState<CourseResponseDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const filteredCourses = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return courses;

    return courses.filter((course) =>
      `${getCourseTitle(course)} ${getCourseDescription(course)}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [courses, search]);

  async function fetchAvailableCourses() {
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      const response = await reviewerCourseService.getAvailableCourses({
        page: 1,
        limit: 30,
      });

      const list = unwrapList<CourseResponseDto>(response);

      setCourses(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.error("Load available courses error:", err?.response || err);

      setError(
        err?.response?.data?.message || "Failed to load available courses."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleClaimCourse(course: CourseResponseDto) {
    const courseId = course.id;

    if (!courseId) {
      setError("Cannot claim this course because course id is missing.");
      return;
    }

    try {
      setClaimingId(courseId);
      setError("");
      setSuccessMessage("");

      await reviewerCourseService.claimCourse(courseId);

      setCourses((prev) => prev.filter((item) => item.id !== courseId));

      setSuccessMessage(
        "Course claimed successfully. You can find it in My Review Tasks."
      );
    } catch (err: any) {
      console.error("Claim course error:", err?.response || err);

      setError(err?.response?.data?.message || "Failed to claim course.");
    } finally {
      setClaimingId(null);
    }
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

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {Array.isArray(error) ? error.join(", ") : error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

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
                        onClick={() => handleClaimCourse(course)}
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
                          Submitted at:{" "}
                          {new Date(course.submittedAt).toLocaleString()}
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
    </main>
    </RoleGuard>
  );
}