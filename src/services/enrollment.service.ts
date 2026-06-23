import api from "@/lib/api";

export type EnrollmentCourseSummary = {
  id: string;
  title: string;
  slug?: string;
  shortDescription?: string | null;
  thumbnailUrl?: string | null;
  level?: string | null;
  price?: number | null;
  durationInMinutes?: number | null;
};

export type PaymentSummary = {
  id?: string;
  amount?: number | null;
  status?: string | null;
  method?: string | null;
  transactionId?: string | null;
  paidAt?: string | null;
};

export type EnrollmentResponse = {
  id: string;
  courseId?: string;
  userId?: string;
  progressPercentage?: number | null;
  enrolledAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  course?: EnrollmentCourseSummary | null;
  payment?: PaymentSummary | null;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  totalItems?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
};

export type PaginatedEnrollmentResponse = {
  data: EnrollmentResponse[];
  meta?: PaginationMeta;
};

export type EnrollmentStatusResponse = {
  enrolled: boolean;
  enrollment: EnrollmentResponse | null;
};

export function unwrapData<T>(response: any): T {
  return response?.data?.data ?? response?.data ?? response;
}

export const enrollmentService = {
  enrollCourse(courseId: string) {
    return api.post(`/v1/enrollments/courses/${courseId}`);
  },

  getMyEnrollments(params?: { page?: number; limit?: number }) {
    return api.get("/v1/enrollments/me", { params });
  },

  getEnrollmentStatus(courseId: string) {
    return api.get(`/v1/enrollments/courses/${courseId}/status`);
  },
};