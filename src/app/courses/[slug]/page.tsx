"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Globe2,
  GraduationCap,
  PlayCircle,
  ShieldCheck,
  Star,
} from "lucide-react";

import {
  publicCourseService,
  unwrapData,
} from "@/services/public-course.service";

import type { PublicCourseDetail } from "@/services/public-course.service";
import { useAuth } from "@/providers/AuthProvider";

function formatPrice(price?: number | null) {
  if (price === null || price === undefined || price === 0) {
    return "Free";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

function formatDuration(minutes?: number | null) {
  if (!minutes) return "Not specified";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours <= 0) return `${mins} minutes`;
  if (mins <= 0) return `${hours} hours`;

  return `${hours}h ${mins}m`;
}

export default function PublicCourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const slug = String(params.slug);

  const [course, setCourse] = useState<PublicCourseDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sections = useMemo(() => {
    return course?.sections ?? [];
  }, [course]);

  const totalLessons = useMemo(() => {
    return sections.reduce((total, section) => {
      return total + (section.lessons?.length ?? 0);
    }, 0);
  }, [sections]);

  async function fetchCourseDetail() {
    try {
      setLoading(true);
      setError("");

      const response = await publicCourseService.getCourseBySlug(slug);
      const payload = unwrapData<PublicCourseDetail>(response);

      setCourse(payload);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to load course detail."
      );
    } finally {
      setLoading(false);
    }
  }

function handleEnrollClick() {
  const currentCourseUrl = `/courses/${slug}`;

  if (!user) {
    router.push(
      `/auth?tab=login&redirect=${encodeURIComponent(currentCourseUrl)}`
    );
    return;
  }

    router.push(`/enroll/${slug}`);
}

  useEffect(() => {
    fetchCourseDetail();
  }, [slug]);

  return (
    <main className="min-h-screen bg-zinc-50">
      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mb-5 inline-flex items-center text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to courses
          </button>

          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {Array.isArray(error) ? error.join(", ") : error}
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl border bg-white p-8 shadow-sm">
              <p className="text-sm text-zinc-500">Loading course...</p>
            </div>
          ) : !course ? (
            <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
              <h1 className="text-xl font-semibold text-zinc-900">
                Course not found
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                This course may not exist or is not public.
              </p>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
              <div>
                <div className="mb-4 flex flex-wrap gap-2">
                  {course.categories?.map((category) => (
                    <span
                      key={category.id}
                      className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                    >
                      {category.name}
                    </span>
                  ))}

                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                    {course.level}
                  </span>
                </div>

                <h1 className="text-4xl font-bold tracking-tight text-zinc-950">
                  {course.title}
                </h1>

                <p className="mt-4 max-w-3xl text-lg leading-7 text-zinc-600">
                  {course.shortDescription}
                </p>

                <div className="mt-6 flex flex-wrap gap-5 text-sm text-zinc-600">
                  <div className="flex items-center gap-2">
                    <Globe2 className="h-4 w-4" />
                    {course.language || "Not specified"}
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {formatDuration(course.durationInMinutes)}
                  </div>

                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    {totalLessons} lessons
                  </div>

                  {course.certificateEnabled && (
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Certificate included
                    </div>
                  )}
                </div>

                {course.instructors?.length ? (
                  <div className="mt-6">
                    <p className="text-sm text-zinc-500">Created by</p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {course.instructors.map((instructor) => (
                        <div
                          key={instructor.id}
                          className="flex items-center gap-2 rounded-full border bg-white px-3 py-2"
                        >
                          {instructor.avatarUrl ? (
                            <img
                              src={instructor.avatarUrl}
                              alt={instructor.fullName}
                              className="h-7 w-7 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100">
                              <GraduationCap className="h-4 w-4 text-zinc-500" />
                            </div>
                          )}

                          <span className="text-sm font-medium text-zinc-800">
                            {instructor.fullName}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <aside className="lg:sticky lg:top-6 lg:self-start">
                <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                  {course.thumbnailUrl ? (
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="h-56 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-56 w-full items-center justify-center bg-zinc-100 text-sm text-zinc-400">
                      No thumbnail
                    </div>
                  )}

                  <div className="p-5">
                    <p className="text-3xl font-bold text-zinc-950">
                      {formatPrice(course.price)}
                    </p>

                    <button
                      type="button"
                      onClick={handleEnrollClick}
                      className="mt-5 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700"
                    >
                      Enroll Now
                    </button>

                    <button
                      type="button"
                      className="mt-3 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
                    >
                      Add to Wishlist
                    </button>

                    <div className="mt-5 space-y-3 text-sm text-zinc-600">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Full lifetime access
                      </div>

                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Learn at your own pace
                      </div>

                      {course.certificateEnabled && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          Certificate after completion
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>

      {course && (
        <section className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-zinc-950">
                What you will learn
              </h2>

              {course.whatYouWillLearn?.length ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {course.whatYouWillLearn.map((item, index) => (
                    <div key={`${item}-${index}`} className="flex gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                      <p className="text-sm leading-6 text-zinc-700">{item}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-zinc-500">
                  No learning outcomes provided.
                </p>
              )}
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-zinc-950">
                Requirements
              </h2>

              {course.requirements?.length ? (
                <ul className="mt-4 list-inside list-disc space-y-2 text-sm leading-6 text-zinc-700">
                  {course.requirements.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-zinc-500">
                  No requirements provided.
                </p>
              )}
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-zinc-950">
                Course Description
              </h2>

              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-zinc-700">
                {course.description || "No description provided."}
              </p>
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-zinc-950">
                    Course Content
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    {sections.length} sections • {totalLessons} lessons
                  </p>
                </div>

                <p className="text-sm text-zinc-500">
                  Preview only. Lesson media unlocks after enrollment.
                </p>
              </div>

              <div className="mt-5 space-y-3">
                {sections.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center">
                    <p className="text-sm text-zinc-500">
                      No curriculum preview available.
                    </p>
                  </div>
                ) : (
                  sections.map((section, sectionIndex) => (
                    <details
                      key={section.id}
                      className="overflow-hidden rounded-xl border bg-zinc-50"
                      open={sectionIndex === 0}
                    >
                      <summary className="cursor-pointer px-4 py-3 font-medium text-zinc-900">
                        Section {sectionIndex + 1}: {section.title}
                      </summary>

                      <div className="border-t bg-white">
                        {section.lessons?.length ? (
                          section.lessons.map((lesson, lessonIndex) => (
                            <div
                              key={lesson.id}
                              className="flex items-center justify-between border-b px-4 py-3 last:border-b-0"
                            >
                              <div className="flex items-center gap-3">
                                <PlayCircle className="h-4 w-4 text-zinc-400" />
                                <span className="text-sm text-zinc-700">
                                  {lessonIndex + 1}. {lesson.title}
                                </span>
                              </div>

                              {lesson.isPreview ? (
                                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                                  Preview
                                </span>
                              ) : (
                                <span className="text-xs text-zinc-400">
                                  Locked
                                </span>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="px-4 py-3 text-sm text-zinc-500">
                            No lessons in this section.
                          </p>
                        )}
                      </div>
                    </details>
                  ))
                )}
              </div>
            </div>

            {course.instructors?.length ? (
              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-zinc-950">
                  Instructor
                </h2>

                <div className="mt-5 space-y-4">
                  {course.instructors.map((instructor) => (
                    <div
                      key={instructor.id}
                      className="flex items-center gap-4 rounded-xl border bg-zinc-50 p-4"
                    >
                      {instructor.avatarUrl ? (
                        <img
                          src={instructor.avatarUrl}
                          alt={instructor.fullName}
                          className="h-16 w-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white">
                          <GraduationCap className="h-7 w-7 text-zinc-500" />
                        </div>
                      )}

                      <div>
                        <p className="font-semibold text-zinc-900">
                          {instructor.fullName}
                        </p>

                        <div className="mt-1 flex items-center gap-1 text-sm text-zinc-500">
                          <Star className="h-4 w-4" />
                          Course instructor
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="hidden lg:block" />
        </section>
      )}
    </main>
  );
}   