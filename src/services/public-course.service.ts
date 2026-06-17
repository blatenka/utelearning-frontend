import api from "@/lib/api";

export type PublicCourseCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  children?: PublicCourseCategory[];
};

export type PublicCourseInstructor = {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
};

export type PublicCourseLesson = {
  id: string;
  title: string;
  description?: string | null;
  lessonIndex?: number;
  isPreview?: boolean;
  isActive?: boolean;
};

export type PublicCourseSection = {
  id: string;
  title: string;
  description?: string | null;
  sectionIndex?: number;
  isActive?: boolean;
  lessons?: PublicCourseLesson[];
};

export type PublicCourseDetail = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description?: string | null;
  whatYouWillLearn?: string[] | null;
  requirements?: string[] | null;
  thumbnailUrl?: string | null;
  level: string;
  price?: number | null;
  language?: string | null;
  durationInMinutes?: number | null;
  certificateEnabled?: boolean;
  status?: string;
  isActive?: boolean;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  categories?: PublicCourseCategory[];
  instructors?: PublicCourseInstructor[];
  sections?: PublicCourseSection[];
};

export type PublicCourseQueryParams = {
  search?: string;
  level?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  language?: string;
  certificateEnabled?: boolean;
  page?: number;
  limit?: number;
  sortField?: string;
  sortDirection?: "asc" | "desc";
};

export const unwrapData = <T>(response: any): T => {
  return response?.data?.data ?? response?.data;
};

export const unwrapList = <T>(response: any): T[] => {
  const payload = unwrapData<any>(response);

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.records)) return payload.records;

  return [];
};

export const publicCourseService = {
  getCategoryTree() {
    return api.get("/v1/courses/public/category-tree");
  },

  getCourses(params?: PublicCourseQueryParams) {
    return api.get("/v1/courses/public", {
      params: {
        page: 1,
        limit: 12,
        ...params,
      },
    });
  },

  getCourseBySlug(slug: string) {
    return api.get(`/v1/courses/public/${slug}`);
  },
};