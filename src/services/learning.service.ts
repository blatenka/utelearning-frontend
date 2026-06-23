import api from "@/lib/api";

export type LearningMediaType = "IMAGE" | "VIDEO" | "RAW";

export type LearningFile = {
  id: string;
  url: string;
  type: LearningMediaType;
  filename?: string | null;
  mimeType?: string | null;
  sizeInBytes?: number | null;
  createdAt?: string | null;
};

export type LearningLesson = {
  id: string;
  title: string;
  description?: string | null;
  lessonIndex?: number | null;
  isActive?: boolean;
  files?: LearningFile[];
};

export type LearningSection = {
  id: string;
  title: string;
  description?: string | null;
  sectionIndex?: number | null;
  isActive?: boolean;
  lessons?: LearningLesson[];
};

export type CourseLearningDetail = {
  id: string;
  title: string;
  slug?: string;
  shortDescription?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  level?: string | null;
  language?: string | null;
  durationInMinutes?: number | null;
  certificateEnabled?: boolean;
  sections?: LearningSection[];
};

export function unwrapData<T>(response: any): T {
  return response?.data?.data ?? response?.data ?? response;
}

export const learningService = {
  getCourseLearningDetail(courseId: string) {
    return api.get(`/v1/learning/courses/${courseId}/detail-learning`);
  },
};