import api from "@/lib/api";

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  isActive?: boolean;
};

export type AdminCourseCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  isActive?: boolean;
  deletedAt?: string | null;
  children?: AdminCourseCategory[];
};

export type ReviewerAuthorizedCategory = {
  id: string;
  name: string;
  slug: string;
};

export type ReviewerCategoryAuthorizations = {
  reviewerId: string;
  categories: ReviewerAuthorizedCategory[];
};

export type ReplaceReviewerCategoryAuthorizationsPayload = {
  categoryIds: string[];
};

export type CourseCategorySummary = {
  id: string;
  name: string;
  slug: string;
};

export type CourseInstructorSummary = {
  id: string;
  fullName: string;
};

export type ReviewerAvailableCourse = {
  id: string;
  courseId?: string;
  title?: string;
  slug?: string;
  shortDescription?: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  level?: string;
  status?: string;
  reviewStatus?: string;
  price?: number | null;
  language?: string | null;
  categories?: CourseCategorySummary[];
  instructors?: CourseInstructorSummary[];
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  course?: {
    id: string;
    title: string;
    slug?: string;
    shortDescription?: string;
    thumbnailUrl?: string | null;
    level?: string;
    categories?: CourseCategorySummary[];
    instructors?: CourseInstructorSummary[];
  };
};

export type ReviewerReviewTask = {
  id: string;
  reviewId?: string;
  courseId?: string;
  status?: string;
  reviewStatus?: string;
  decision?: string | null;
  note?: string | null;
  claimedAt?: string;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  title?: string;
  shortDescription?: string;
  thumbnailUrl?: string | null;
  level?: string;
  categories?: CourseCategorySummary[];
  instructors?: CourseInstructorSummary[];
  course?: {
    id: string;
    title: string;
    slug?: string;
    shortDescription?: string;
    thumbnailUrl?: string | null;
    level?: string;
    status?: string;
    categories?: CourseCategorySummary[];
    instructors?: CourseInstructorSummary[];
  };
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

  return [];
};

export function flattenCategories(
  categories: AdminCourseCategory[]
): AdminCourseCategory[] {
  const result: AdminCourseCategory[] = [];

  function walk(items: AdminCourseCategory[]) {
    for (const item of items) {
      result.push(item);

      if (item.children?.length) {
        walk(item.children);
      }
    }
  }

  walk(categories);
  return result;
}

export const adminReviewerCategoryService = {
  getReviewers(params?: any) {
    return api.get("/v1/admin/users", {
      params: {
        role: "REVIEWER",
        limit: 100,
        ...params,
      },
    });
  },

  getCategories(params?: any) {
    return api.get("/v1/admin/courses/categories", {
      params: {
        limit: 100,
        includeDeleted: false,
        ...params,
      },
    });
  },

  getReviewerCategories(reviewerId: string) {
    return api.get(`/v1/admin/courses/reviewers/${reviewerId}/categories`);
  },

  replaceReviewerCategories(
    reviewerId: string,
    payload: ReplaceReviewerCategoryAuthorizationsPayload
  ) {
    return api.put(
      `/v1/admin/courses/reviewers/${reviewerId}/categories`,
      payload
    );
  },
};

export const reviewerCourseService = {
  getAvailableCourses(params?: any) {
    return api.get("/v1/reviewer/courses/available", {
      params: {
        page: 1,
        limit: 20,
        ...params,
      },
    });
  },

  getMyReviewTasks(params?: any) {
    return api.get("/v1/reviewer/courses", {
      params: {
        page: 1,
        limit: 20,
        ...params,
      },
    });
  },

  claimCourse(courseId: string) {
    return api.post(`/v1/reviewer/courses/${courseId}/claim`);
  },
};