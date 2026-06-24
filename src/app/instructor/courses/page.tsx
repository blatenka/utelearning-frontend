"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Edit,
  Layers,
  PlusCircle,
  Trash2,
} from "lucide-react";
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

export default function InstructorCoursesPage() {
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [courseToDelete, setCourseToDelete] =
    useState<InstructorCourse | null>(null);

  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchCourses() {
    try {
      setLoading(true);
      setError(null);

      const response = await instructorCourseService.getMyCourses({
        page: 1,
        limit: 20,
        sortField: "updatedAt",
        sortDirection: "desc",
      });

      setCourses(unwrapList<InstructorCourse>(response));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load instructor courses."));
    } finally {
      setLoading(false);
    }
  }

  async function confirmDeleteDraft() {
    if (!courseToDelete) return;

    try {
      setDeletingId(courseToDelete.id);
      setError(null);

      await instructorCourseService.deleteDraftCourse(courseToDelete.id);

      setCourses((prev) =>
        prev.filter((course) => course.id !== courseToDelete.id)
      );

      setCourseToDelete(null);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete draft course."));
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    fetchCourses();
  }, []);

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

        {error && (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

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
            {courses.map((course) => (
              <Card key={course.id}>
                <CardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <CardTitle>{course.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {course.shortDescription || "No short description"}
                      </CardDescription>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {course.status && <Badge>{course.status}</Badge>}

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
                        <span className="ml-3">${course.price}</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
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
            ))}
          </div>
        )}

        {courseToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-xl border bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
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
      </main>
    </RoleGuard>
  );
}