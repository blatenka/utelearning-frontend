import api from "@/lib/api";

export type AdminCourseCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  parentName?: string;
  order: number;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
  courseCount?: number;
  childrenCount?: number;
};

export type AdminCategorySortBy = "name" | "order" | "createdAt" | "updatedAt";
export type AdminCategorySortOrder = "asc" | "desc";
export type AdminCategoryStatusFilter = boolean | "all";

export type GetAdminCategoriesParams = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: AdminCategoryStatusFilter;
  includeDeleted?: boolean;
  sortBy?: AdminCategorySortBy;
  sortOrder?: AdminCategorySortOrder;
};

export type CreateAdminCategoryPayload = {
  name: string;
  description?: string;
  parentId?: string;
};

export type UpdateAdminCategoryPayload = {
  name?: string;
  description?: string | null;
  parentId?: string | null;
  order?: number;
  isActive?: boolean;
};

function normalizeBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true" ||
    value === "TRUE"
  );
}

export function normalizeAdminCategory(category: any): AdminCourseCategory {
  return {
    ...category,
    isActive: normalizeBoolean(category.isActive),
  };
}

function buildCategoryQuery(params: GetAdminCategoriesParams) {
  const query = new URLSearchParams();

  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  query.set("sortBy", params.sortBy ?? "createdAt");
  query.set("sortOrder", params.sortOrder ?? "desc");

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params.isActive !== undefined && params.isActive !== "all") {
    query.set("isActive", params.isActive ? "true" : "false");
  }

  if (params.includeDeleted) {
    query.set("includeDeleted", "true");
  }

  return query.toString();
}

export const adminCourseCategoryService = {
  async getCategories(params: GetAdminCategoriesParams) {
    const query = buildCategoryQuery(params);
    const response = await api.get(`/v1/admin/courses/categories?${query}`);

    const list = response.data?.data?.data || [];
    const meta = response.data?.data?.meta || {};

    return {
      data: Array.isArray(list) ? list.map(normalizeAdminCategory) : [],
      meta: {
        total: Number(meta.total || 0),
        page: Number(meta.page || params.page || 1),
        limit: Number(meta.limit || params.limit || 10),
      },
    };
  },

  createCategory(payload: CreateAdminCategoryPayload) {
    return api.post("/v1/admin/courses/categories", payload);
  },

  updateCategory(id: string, payload: UpdateAdminCategoryPayload) {
    return api.patch(`/v1/admin/courses/categories/${id}`, payload);
  },

  softDeleteCategory(id: string) {
    return api.patch(`/v1/admin/courses/categories/${id}/soft-delete`);
  },

  restoreCategory(id: string) {
    return api.patch(`/v1/admin/courses/categories/${id}/restore`);
  },

  updateActiveStatus(id: string, isActive: boolean) {
    return api.patch(`/v1/admin/courses/categories/${id}/active-status`, {
      isActive,
    });
  },
};