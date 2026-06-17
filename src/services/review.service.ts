import api from "@/lib/api";

export type CourseLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export type CourseStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "PUBLISHED"
  | "REJECTED"
  | "NEEDS_CHANGES"
  | string;

export type CourseReviewStatus =
  | "PENDING"
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REJECTED"
  | string;

export type ReviewDecisionStatus =
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REJECTED";

export type SortDirection = "asc" | "desc";

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

export type PaginationMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta?: PaginationMeta;
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

export type ReviewerCourseReviewFileMedia = {
  id: string;
  lessonId: string;
  cloudinaryPublicId?: string | null;
  url: string;
  type: string;
  filename?: string | null;
  mimeType?: string | null;
  sizeInBytes?: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type ReviewerCourseReviewLesson = {
  id: string;
  sectionId: string;
  title: string;
  description?: string | null;
  lessonIndex: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  files: ReviewerCourseReviewFileMedia[];
};

export type ReviewerCourseReviewSection = {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  sectionIndex: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  lessons: ReviewerCourseReviewLesson[];
};

export type ReviewerCourseReviewCourse = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description?: string | null;
  whatYouWillLearn?: string[] | null;
  requirements?: string[] | null;
  thumbnailUrl?: string | null;
  level: CourseLevel;
  price?: number | null;
  language?: string | null;
  durationInMinutes?: number | null;
  certificateEnabled: boolean;
  status: CourseStatus;
  isActive: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  categories: CourseCategorySummary[];
  instructors: CourseInstructorSummary[];
  sections: ReviewerCourseReviewSection[];
};

export type ReviewerCourseSummary = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  level: CourseLevel;
  price?: number | null;
  language?: string | null;
  durationInMinutes?: number | null;
  certificateEnabled: boolean;
  status: CourseStatus;
  isActive: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  categories: CourseCategorySummary[];
  instructors: CourseInstructorSummary[];
};

export type ReviewerCourseTask = {
  reviewId: string;
  reviewStatus: CourseReviewStatus;
  reviewNote?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
  course: ReviewerCourseSummary;
};

export type ReviewerCourseReviewWorkspace = {
  reviewId: string;
  reviewStatus: CourseReviewStatus;
  reviewNote?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
  course: ReviewerCourseReviewCourse;
};

export type ClaimCourseReviewResponse = {
  reviewId: string;
  reviewStatus: CourseReviewStatus;
  submittedAt: string;
  course: {
    id: string;
    status: CourseStatus;
    reviewClaimedById?: string | null;
    reviewClaimedAt?: string | null;
  };
};

export type SubmitCourseReviewDecisionPayload = {
  status: ReviewDecisionStatus;
  reviewNote?: string | null;
};

export type SubmitCourseReviewDecisionResponse = {
  reviewId: string;
  reviewStatus: CourseReviewStatus;
  reviewNote?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
  course: {
    id: string;
    status: CourseStatus;
    publishedAt?: string | null;
    updatedAt: string;
  };
};

export type ReviewerCourseQueryParams = {
  search?: string;
  level?: CourseLevel;
  status?: CourseStatus;
  reviewStatus?: CourseReviewStatus;
  categoryId?: string;
  page?: number;
  limit?: number;
  sortField?: "title" | "createdAt" | "updatedAt" | "submittedAt" | "reviewedAt";
  sortDirection?: SortDirection;
};

export type AvailableReviewerCourseQueryParams = {
  search?: string;
  level?: CourseLevel;
  categoryId?: string;
  page?: number;
  limit?: number;
  sortField?: "title" | "createdAt" | "updatedAt";
  sortDirection?: SortDirection;
};

export type AdminCourseCategoryQueryParams = {
  search?: string;
  isActive?: boolean;
  includeDeleted?: boolean;
  parentId?: string;
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
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.records)) return payload.records;

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
  getReviewers(params?: { page?: number; limit?: number; search?: string }) {
    return api.get("/v1/admin/users", {
      params: {
        role: "REVIEWER",
        limit: 100,
        ...params,
      },
    });
  },

  getCategories(params?: AdminCourseCategoryQueryParams) {
    return api.get("/v1/admin/courses/categories", {
      params: {
        limit: 100,
        includeDeleted: false,
        ...params,
      },
    });
  },

  getReviewerCategories(reviewerId: string) {
    return api.get<ReviewerCategoryAuthorizations>(
      `/v1/admin/courses/reviewers/${reviewerId}/categories`
    );
  },

  replaceReviewerCategories(
    reviewerId: string,
    payload: ReplaceReviewerCategoryAuthorizationsPayload
  ) {
    return api.put<ReviewerCategoryAuthorizations>(
      `/v1/admin/courses/reviewers/${reviewerId}/categories`,
      payload
    );
  },
};

export const reviewerCourseService = {
  getAvailableCourses(params?: AvailableReviewerCourseQueryParams) {
    return api.get<PaginatedResponse<ReviewerCourseSummary>>(
      "/v1/reviewer/courses/available",
      {
        params: {
          page: 1,
          limit: 20,
          sortField: "updatedAt",
          sortDirection: "desc",
          ...params,
        },
      }
    );
  },

  getMyReviewTasks(params?: ReviewerCourseQueryParams) {
    return api.get<PaginatedResponse<ReviewerCourseTask>>(
      "/v1/reviewer/courses",
      {
        params: {
          page: 1,
          limit: 20,
          sortField: "submittedAt",
          sortDirection: "desc",
          ...params,
        },
      }
    );
  },

  claimCourse(courseId: string) {
    return api.post<ClaimCourseReviewResponse>(
      `/v1/reviewer/courses/${courseId}/claim`
    );
  },

  getReviewWorkspace(reviewId: string) {
    return api.get<ReviewerCourseReviewWorkspace>(
      `/v1/reviewer/courses/${reviewId}`
    );
  },

  submitDecision(
    reviewId: string,
    payload: SubmitCourseReviewDecisionPayload
  ) {
    return api.patch<SubmitCourseReviewDecisionResponse>(
      `/v1/reviewer/courses/${reviewId}/decision`,
      payload
    );
  },
};