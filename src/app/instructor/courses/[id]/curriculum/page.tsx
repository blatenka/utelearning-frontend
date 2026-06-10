"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Edit, GripVertical, PlusCircle, Save, Trash2, X } from "lucide-react";

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
  unwrapList,
} from "@/services/instructor-course.service";

import type {
  Section,
  Lesson,
  InstructorCourse,
} from "@/services/instructor-course.service";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

      await instructorCourseService.createSection(courseId, {
        title: sectionTitle,
        description: sectionDescription || undefined,
      });

      setSectionTitle("");
      setSectionDescription("");
      await fetchSectionsAndLessons();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to create section.");
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
      await instructorCourseService.updateSection(courseId, sectionId, {
        title: editSectionTitle,
        description: editSectionDescription || null,
      });

      setEditingSectionId(null);
      await fetchSectionsAndLessons();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to update section.");
    }
  }

  async function handleDeleteSection(sectionId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this section?"
    );

    if (!confirmed) return;

    try {
      await instructorCourseService.deleteSection(courseId, sectionId);
      await fetchSectionsAndLessons();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to delete section.");
    }
  }

  async function handleToggleSection(section: Section) {
    try {
      await instructorCourseService.changeSectionStatus(
        courseId,
        section.id,
        !section.isActive
      );

      await fetchSectionsAndLessons();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to update section status.");
    }
  }

  async function handleCreateLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!lessonFormSectionId) return;

    try {
      await instructorCourseService.createLesson(courseId, lessonFormSectionId, {
        title: lessonTitle,
        description: lessonDescription || null,
      });

      setLessonTitle("");
      setLessonDescription("");
      setLessonFormSectionId(null);
      await fetchSectionsAndLessons();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to create lesson.");
    }
  }

  function startEditLesson(lesson: Lesson) {
    setEditingLessonId(lesson.id);
    setEditLessonTitle(lesson.title);
    setEditLessonDescription(lesson.description ?? "");
  }

  async function handleUpdateLesson(sectionId: string, lessonId: string) {
    try {
      await instructorCourseService.updateLesson(courseId, sectionId, lessonId, {
        title: editLessonTitle,
        description: editLessonDescription || null,
      });

      setEditingLessonId(null);
      await fetchSectionsAndLessons();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to update lesson.");
    }
  }

  async function handleDeleteLesson(sectionId: string, lessonId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this lesson?"
    );

    if (!confirmed) return;

    try {
      await instructorCourseService.deleteLesson(courseId, sectionId, lessonId);
      await fetchSectionsAndLessons();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to delete lesson.");
    }
  }

  async function handleToggleLesson(sectionId: string, lesson: Lesson) {
    try {
      await instructorCourseService.updateLesson(courseId, sectionId, lesson.id, {
        isActive: !lesson.isActive,
      });

      await fetchSectionsAndLessons();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to update lesson status.");
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
      alert(err?.response?.data?.message || "Failed to reorder sections.");
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
      alert(err?.response?.data?.message || "Failed to reorder lessons.");
      await fetchSectionsAndLessons();
    }
  }

  useEffect(() => {
    fetchCurrentCourse();
    fetchSectionsAndLessons();
  }, [courseId]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Card className="mb-8 overflow-hidden">
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

                  <Badge>{course.level}</Badge>

                  {course.isActive === false && (
                    <Badge variant="destructive">Inactive</Badge>
                  )}
                </div>

                <CardDescription className="text-base">
                  {course.shortDescription}
                </CardDescription>
              </div>

              {course.thumbnailUrl && (
                <img
                  src={course.thumbnailUrl}
                  alt={course.title}
                  className="h-28 w-full rounded-lg object-cover md:w-44"
                />
              )}
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
                    ? `$${course.price}`
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

            {course.description && (
              <div className="mt-4 border-t pt-4">
                <p className="text-sm font-medium text-foreground">
                  Description
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {course.description}
                </p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

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
            />

            <Textarea
              value={sectionDescription}
              onChange={(event) => setSectionDescription(event.target.value)}
              placeholder="Section description"
              maxLength={1000}
            />

            <Button type="submit" disabled={creatingSection}>
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
                        />

                        <Textarea
                          value={editSectionDescription}
                          onChange={(event) =>
                            setEditSectionDescription(event.target.value)
                          }
                        />

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateSection(section.id)}
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
                          <div className="flex items-center gap-2">
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
                          >
                            {section.isActive ? "Disable" : "Enable"}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditSection(section)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteSection(section.id)}
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
                              className="rounded-lg border bg-background p-4"
                            >
                              {editingLessonId === lesson.id ? (
                                <div className="space-y-3">
                                  <Input
                                    value={editLessonTitle}
                                    onChange={(event) =>
                                      setEditLessonTitle(event.target.value)
                                    }
                                  />

                                  <Textarea
                                    value={editLessonDescription}
                                    onChange={(event) =>
                                      setEditLessonDescription(
                                        event.target.value
                                      )
                                    }
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
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium">
                                        Lesson {lessonIndex + 1}: {lesson.title}
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
                                      disabled={lessonIndex === 0}
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
                                        (section.lessons?.length ?? 0) - 1
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
                                        handleToggleLesson(section.id, lesson)
                                      }
                                    >
                                      {lesson.isActive ? "Disable" : "Enable"}
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => startEditLesson(lesson)}
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
                                    >
                                      Delete
                                    </Button>
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
                        />

                        <Textarea
                          value={lessonDescription}
                          onChange={(event) =>
                            setLessonDescription(event.target.value)
                          }
                          placeholder="Lesson description"
                          maxLength={2000}
                        />

                        <div className="flex gap-2">
                          <Button type="submit" size="sm">
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
    </main>
  );
}