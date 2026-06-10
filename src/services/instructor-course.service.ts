import api from "@/lib/api";

export type CourseLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export type InstructorCourse = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  level: CourseLevel;
  price?: number | null;
  language?: string | null;
  certificateEnabled: boolean;
  status?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Section = {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  sectionIndex: number;
  isActive: boolean;
  lessons?: Lesson[];
};

export type Lesson = {
  id: string;
  sectionId: string;
  title: string;
  description?: string | null;
  lessonIndex: number;
  isActive: boolean;
};

export type CreateCoursePayload = {
  title: string;
  shortDescription: string;
  description?: string;
  whatYouWillLearn?: string[];
  requirements?: string[];
  level: CourseLevel;
  price?: number;
  language?: string;
  certificateEnabled?: boolean;
  categoryIds: string[];
};

export type UpdateCoursePayload = Partial<CreateCoursePayload>;

export type CreateSectionPayload = {
  title: string;
  description?: string;
};

export type UpdateSectionPayload = {
  title?: string;
  description?: string | null;
};

export type CreateLessonPayload = {
  title: string;
  description?: string | null;
};

export type UpdateLessonPayload = {
  title?: string;
  description?: string | null;
  isActive?: boolean;
};

export type SectionQuery = {
  search?: string;
  isActive?: boolean;
  includeDeleted?: boolean;
  sortField?: "title" | "sectionIndex" | "createdAt" | "updatedAt";
  sortDirection?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type LessonQuery = {
  search?: string;
  isActive?: boolean;
  sortField?: "title" | "lessonIndex" | "createdAt" | "updatedAt";
  sortDirection?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export const unwrapData = <T>(response: any): T => {
  return response?.data?.data ?? response?.data;
};

export const unwrapList = <T>(response: any): T[] => {
  const payload = unwrapData<any>(response);

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;

  return [];
};

export const instructorCourseService = {
  getMyCourses(params?: any) {
    return api.get("/v1/instructor/courses", { params });
  },

  createCourse(payload: CreateCoursePayload) {
    return api.post("/v1/instructor/courses", payload);
  },

  updateCourse(courseId: string, payload: UpdateCoursePayload) {
    return api.patch(`/v1/instructor/courses/${courseId}`, payload);
  },

  deleteDraftCourse(courseId: string) {
    return api.delete(`/v1/instructor/courses/${courseId}/draft`);
  },

  getSections(courseId: string, params?: SectionQuery) {
    return api.get(`/v1/instructor/courses/${courseId}/sections`, { params });
  },

  createSection(courseId: string, payload: CreateSectionPayload) {
    return api.post(`/v1/instructor/courses/${courseId}/sections`, payload);
  },

  updateSection(courseId: string, sectionId: string, payload: UpdateSectionPayload) {
    return api.patch(
      `/v1/instructor/courses/${courseId}/sections/${sectionId}`,
      payload
    );
  },

  deleteSection(courseId: string, sectionId: string) {
    return api.delete(
      `/v1/instructor/courses/${courseId}/sections/${sectionId}`
    );
  },

  changeSectionStatus(courseId: string, sectionId: string, isActive: boolean) {
    return api.patch(
      `/v1/instructor/courses/${courseId}/sections/${sectionId}/status`,
      { isActive }
    );
  },

  reorderSections(courseId: string, sectionIds: string[]) {
    return api.patch(`/v1/instructor/courses/${courseId}/sections/reorder`, {
      sectionIds,
    });
  },

  getLessons(courseId: string, sectionId: string, params?: LessonQuery) {
    return api.get(
      `/v1/instructor/courses/${courseId}/sections/${sectionId}/lessons`,
      { params }
    );
  },

  createLesson(courseId: string, sectionId: string, payload: CreateLessonPayload) {
    return api.post(
      `/v1/instructor/courses/${courseId}/sections/${sectionId}/lessons`,
      payload
    );
  },

  updateLesson(
    courseId: string,
    sectionId: string,
    lessonId: string,
    payload: UpdateLessonPayload
  ) {
    return api.patch(
      `/v1/instructor/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`,
      payload
    );
  },

  deleteLesson(courseId: string, sectionId: string, lessonId: string) {
    return api.delete(
      `/v1/instructor/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`
    );
  },

  reorderLessons(courseId: string, sectionId: string, lessonIds: string[]) {
    return api.patch(
      `/v1/instructor/courses/${courseId}/sections/${sectionId}/lessons/reorder`,
      { lessonIds }
    );
  },
};