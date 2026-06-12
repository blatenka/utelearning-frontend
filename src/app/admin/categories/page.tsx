"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

type Category = {
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

type FormMode = "create" | "edit";

type SortBy = "name" | "order" | "createdAt" | "updatedAt";
type SortOrder = "asc" | "desc";

type ConfirmModalState = {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  variant: "danger" | "warning" | "success";
  onConfirm: (() => Promise<void>) | null;
};

export default function AdminCategoriesPage() {
  const { user, loading: authLoading } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | "all">("all");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const [formMode, setFormMode] = useState<FormMode>("create");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    parentId: "",
    order: "0",
    isActive: "true",
  });

  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    open: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    variant: "danger",
    onConfirm: null,
  });

  const isAdmin = user?.role === "ADMIN";
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const formatDateTime = (value?: Date | string | null) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getErrorMessage = (err: any, fallback: string) => {
    const message = err?.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(", ");
    }

    return message || fallback;
  };

  const loadCategories = async () => {
    setTableLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
      });

      if (search.trim()) {
        params.append("search", search.trim());
      }

      if (filterActive !== "all") {
        params.append("isActive", String(filterActive));
      }

      if (includeDeleted) {
        params.append("includeDeleted", "true");
      }

      const res = await api.get(`/v1/admin/courses/categories?${params.toString()}`);

      setCategories(res.data?.data?.data || []);
      setTotal(res.data?.data?.meta?.total || 0);
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to load categories"));
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    loadCategories();
  }, [isAdmin, page, limit, search, filterActive, includeDeleted, sortBy, sortOrder]);

  useEffect(() => {
    if (!success) return;

    const timer = setTimeout(() => {
      setSuccess(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [success]);

  const closeConfirmModal = () => {
    setConfirmModal({
      open: false,
      title: "",
      message: "",
      confirmText: "Confirm",
      variant: "danger",
      onConfirm: null,
    });
  };

  const resetForm = () => {
    setFormMode("create");
    setSelectedCategoryId(null);
    setFormData({
      name: "",
      description: "",
      parentId: "",
      order: "0",
      isActive: "true",
    });
    setError(null);
  };

  const handleNewCategory = () => {
    resetForm();
    setSuccess(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleEdit = (category: Category) => {
    setFormMode("edit");
    setSelectedCategoryId(category.id);

    setFormData({
      name: category.name || "",
      description: category.description || "",
      parentId: category.parentId || "",
      order: String(category.order ?? 0),
      isActive: String(Boolean(category.isActive)),
    });

    setError(null);
    setSuccess(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const buildCreatePayload = () => {
    const payload: {
      name: string;
      description?: string;
      parentId?: string;
    } = {
      name: formData.name.trim(),
    };

    if (formData.description.trim()) {
      payload.description = formData.description.trim();
    }

    if (formData.parentId) {
      payload.parentId = formData.parentId;
    }

    return payload;
  };

  const buildUpdatePayload = () => {
    const payload: {
      name?: string;
      description?: string | null;
      parentId?: string | null;
      order?: number;
      isActive?: boolean;
    } = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      parentId: formData.parentId || null,
      order: Number(formData.order),
      isActive: formData.isActive === "true",
    };

    return payload;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!formData.name.trim()) {
      setError("Category name is required");
      setLoading(false);
      return;
    }

    if (formData.name.trim().length > 100 && formMode === "create") {
      setError("Category name must be shorter than 100 characters");
      setLoading(false);
      return;
    }

    if (formData.description.trim().length > 500 && formMode === "create") {
      setError("Description must be shorter than 500 characters");
      setLoading(false);
      return;
    }

    if (formMode === "edit" && Number.isNaN(Number(formData.order))) {
      setError("Order must be a number");
      setLoading(false);
      return;
    }

    try {
      if (formMode === "create") {
        await api.post("/v1/admin/courses/categories", buildCreatePayload());
        setSuccess("Category created successfully");
      }

      if (formMode === "edit" && selectedCategoryId) {
        await api.patch(`/v1/admin/courses/categories/${selectedCategoryId}`, buildUpdatePayload());
        setSuccess("Category updated successfully");
      }

      resetForm();
      setPage(1);
      await loadCategories();
    } catch (err: any) {
      setError(getErrorMessage(err, "Save failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSoftDelete = (category: Category) => {
    setConfirmModal({
      open: true,
      title: "Delete category?",
      message: `Are you sure you want to delete "${category.name}"? This category will be soft deleted and can be restored later.`,
      confirmText: "Delete",
      variant: "danger",
      onConfirm: async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
          await api.patch(`/v1/admin/courses/categories/${category.id}/soft-delete`);
          setSuccess("Category soft deleted");

          if (selectedCategoryId === category.id) {
            resetForm();
          }

          await loadCategories();
          closeConfirmModal();
        } catch (err: any) {
          setError(getErrorMessage(err, "Delete failed"));
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleRestore = (category: Category) => {
    setConfirmModal({
      open: true,
      title: "Restore category?",
      message: `Are you sure you want to restore "${category.name}"? This category will become available again.`,
      confirmText: "Restore",
      variant: "success",
      onConfirm: async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
          await api.patch(`/v1/admin/courses/categories/${category.id}/restore`);
          setSuccess("Category restored");
          await loadCategories();
          closeConfirmModal();
        } catch (err: any) {
          setError(getErrorMessage(err, "Restore failed"));
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleToggleActive = (category: Category) => {
    const nextStatus = !category.isActive;

    setConfirmModal({
      open: true,
      title: nextStatus ? "Activate category?" : "Deactivate category?",
      message: nextStatus
        ? `Are you sure you want to activate "${category.name}"?`
        : `Are you sure you want to deactivate "${category.name}"? Learners may not be able to see this category.`,
      confirmText: nextStatus ? "Activate" : "Deactivate",
      variant: nextStatus ? "success" : "warning",
      onConfirm: async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
          await api.patch(`/v1/admin/courses/categories/${category.id}/active-status`, {
            isActive: nextStatus,
          });

          setSuccess(`Category ${nextStatus ? "activated" : "deactivated"}`);

          if (selectedCategoryId === category.id) {
            setFormData((prev) => ({
              ...prev,
              isActive: String(nextStatus),
            }));
          }

          await loadCategories();
          closeConfirmModal();
        } catch (err: any) {
          setError(getErrorMessage(err, "Update failed"));
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const getModalIconStyle = () => {
    if (confirmModal.variant === "danger") {
      return "bg-red-100 text-red-600";
    }

    if (confirmModal.variant === "warning") {
      return "bg-yellow-100 text-yellow-700";
    }

    return "bg-green-100 text-green-700";
  };

  const getModalButtonStyle = () => {
    if (confirmModal.variant === "danger") {
      return "bg-red-600 hover:bg-red-700";
    }

    if (confirmModal.variant === "warning") {
      return "bg-yellow-600 hover:bg-yellow-700";
    }

    return "bg-green-600 hover:bg-green-700";
  };

  const getModalIcon = () => {
    if (confirmModal.variant === "danger") return "!";
    if (confirmModal.variant === "warning") return "!";
    return "✓";
  };

  if (authLoading) {
    return <div className="p-6 text-center text-zinc-500">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="p-6 text-center text-red-500">
        Please log in as an admin to view this page.
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 text-center text-red-500">
        Access denied. Admins only.
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-zinc-50 p-6">
        <div className="mx-auto max-w-[1500px] space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-zinc-900">
                  Admin — Categories
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Create, edit, search, filter and manage course categories.
                </p>
              </div>

              <button
                type="button"
                onClick={handleNewCategory}
                disabled={loading}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                + New Category
              </button>
            </div>
          </div>

          {(error || success) && (
            <div className="space-y-3">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                  {success}
                </div>
              )}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-6 flex flex-col gap-2 border-b border-zinc-200 pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-zinc-900">
                  {formMode === "create" ? "Create Category" : "Edit Category"}
                </h3>
                <p className="text-sm text-zinc-500">
                  {formMode === "create"
                    ? "Create new category for your courses."
                    : "Update Category details like name, description, parent, order and active status."}
                </p>
              </div>

              {formMode === "edit" && selectedCategoryId && (
                <div className="rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-600">
                  Editing ID:{" "}
                  <span className="font-medium">{selectedCategoryId}</span>
                </div>
              )}
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-2 text-sm xl:col-span-2">
                <span className="font-medium text-zinc-700">
                  Category Name *
                </span>
                <input
                  type="text"
                  maxLength={formMode === "create" ? 100 : 255}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-zinc-100"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value,
                    })
                  }
                  disabled={loading}
                  required
                />
              </label>

              <label className="space-y-2 text-sm xl:col-span-2">
                <span className="font-medium text-zinc-700">
                  Parent Category
                </span>
                <select
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-zinc-100"
                  value={formData.parentId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      parentId: e.target.value,
                    })
                  }
                  disabled={loading}
                >
                  <option value="">None Top-level</option>

                  {categories
                    .filter(
                      (category) =>
                        category.id !== selectedCategoryId && !category.deletedAt
                    )
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </label>

              {formMode === "edit" && (
                <>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-zinc-700">Order</span>
                    <input
                      type="number"
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-zinc-100"
                      value={formData.order}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          order: e.target.value,
                        })
                      }
                      disabled={loading}
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-zinc-700">Status</span>
                    <select
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-zinc-100"
                      value={formData.isActive}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isActive: e.target.value,
                        })
                      }
                      disabled={loading}
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </label>
                </>
              )}

              <label className="space-y-2 text-sm md:col-span-2 xl:col-span-3">
                <span className="font-medium text-zinc-700">Description</span>
                <textarea
                  maxLength={formMode === "create" ? 500 : undefined}
                  className="min-h-[110px] w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-zinc-100"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  disabled={loading}
                />
                {formMode === "create" && (
                  <p className="text-xs text-zinc-500">
                    {formData.description.length}/500 characters
                  </p>
                )}
              </label>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm md:col-span-2 xl:col-span-1">
                <p className="font-medium text-zinc-800">Category Preview</p>

                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-xs text-zinc-500">Name</p>
                    <p className="font-medium text-zinc-800">
                      {formData.name.trim() || "New category"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500">Parent</p>
                    <p className="font-medium text-zinc-800">
                      {categories.find((item) => item.id === formData.parentId)
                        ?.name || "Top-level category"}
                    </p>
                  </div>

                  {formMode === "edit" && (
                    <>
                      <div>
                        <p className="text-xs text-zinc-500">Order</p>
                        <p className="font-medium text-zinc-800">
                          {formData.order || "0"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-zinc-500">Status</p>
                        <span
                          className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            formData.isActive === "true"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {formData.isActive === "true" ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </>
                  )}

                  <div>
                    <p className="text-xs text-zinc-500">Description</p>
                    <p className="line-clamp-3 text-zinc-700">
                      {formData.description.trim() || "No description"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {loading
                  ? "Saving..."
                  : formMode === "create"
                  ? "Create Category"
                  : "Update Category"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                disabled={loading}
                className="rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset Form
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 p-6">
              <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-zinc-900">
                    Category Datatable
                  </h3>
                  <p className="text-sm text-zinc-500">
                    Showing all category information returned from the category API.
                  </p>
                </div>

                <div className="text-sm text-zinc-500">
                  Total:{" "}
                  <span className="font-medium text-zinc-800">{total}</span>{" "}
                  categories
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <input
                  type="text"
                  placeholder="Search categories..."
                  className="rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />

                <select
                  className="rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={filterActive === "all" ? "all" : String(filterActive)}
                  onChange={(e) => {
                    setFilterActive(
                      e.target.value === "all"
                        ? "all"
                        : e.target.value === "true"
                    );
                    setPage(1);
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>

                <label className="flex items-center gap-3 rounded-xl border border-zinc-300 px-3 py-2.5 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={includeDeleted}
                    onChange={(e) => {
                      setIncludeDeleted(e.target.checked);
                      setPage(1);
                    }}
                  />
                  Show Deleted
                </label>

                <select
                  className="rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split("-");

                    setSortBy(field as SortBy);
                    setSortOrder(order as SortOrder);
                    setPage(1);
                  }}
                >
                  <option value="createdAt-desc">Newest First</option>
                  <option value="createdAt-asc">Oldest First</option>
                  <option value="updatedAt-desc">Recently Updated</option>
                  <option value="updatedAt-asc">Oldest Updated</option>
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="order-asc">Order Asc</option>
                  <option value="order-desc">Order Desc</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1550px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                    <th className="px-4 py-3 text-left font-semibold">ID</th>
                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Slug</th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Parent ID
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Parent Name
                    </th>
                    <th className="px-4 py-3 text-center font-semibold">Order</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                    <th className="px-4 py-3 text-center font-semibold">Courses</th>
                    <th className="px-4 py-3 text-center font-semibold">
                      Children
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Created At
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Updated At
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Deleted At
                    </th>
                    <th className="px-4 py-3 text-center font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {tableLoading ? (
                    <tr>
                      <td
                        colSpan={14}
                        className="px-4 py-8 text-center text-zinc-500"
                      >
                        Loading categories...
                      </td>
                    </tr>
                  ) : categories.length === 0 ? (
                    <tr>
                      <td
                        colSpan={14}
                        className="px-4 py-8 text-center text-zinc-500"
                      >
                        No categories found
                      </td>
                    </tr>
                  ) : (
                    categories.map((category) => (
                      <tr
                        key={category.id}
                        className={`border-b border-zinc-100 transition hover:bg-zinc-50 ${
                          selectedCategoryId === category.id ? "bg-blue-50/60" : ""
                        } ${category.deletedAt ? "opacity-75" : ""}`}
                      >
                        <td className="max-w-[180px] truncate px-4 py-3 font-mono text-xs text-zinc-500">
                          {category.id || "-"}
                        </td>

                        <td className="px-4 py-3 font-medium text-zinc-900">
                          <div className="flex items-center gap-2">
                            <span>{category.name || "-"}</span>

                            {category.deletedAt && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                                DELETED
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="max-w-[180px] truncate px-4 py-3 text-xs text-zinc-600">
                          {category.slug || "-"}
                        </td>

                        <td className="max-w-[260px] truncate px-4 py-3 text-zinc-600">
                          {category.description || "-"}
                        </td>

                        <td className="max-w-[180px] truncate px-4 py-3 font-mono text-xs text-zinc-500">
                          {category.parentId || "-"}
                        </td>

                        <td className="px-4 py-3 text-zinc-600">
                          {category.parentName || "-"}
                        </td>

                        <td className="px-4 py-3 text-center text-zinc-700">
                          {category.order ?? 0}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                              category.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {category.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center text-zinc-700">
                          {category.courseCount || 0}
                        </td>

                        <td className="px-4 py-3 text-center text-zinc-700">
                          {category.childrenCount || 0}
                        </td>

                        <td className="px-4 py-3 text-zinc-600">
                          {formatDateTime(category.createdAt)}
                        </td>

                        <td className="px-4 py-3 text-zinc-600">
                          {formatDateTime(category.updatedAt)}
                        </td>

                        <td className="px-4 py-3 text-zinc-600">
                          {formatDateTime(category.deletedAt)}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(category)}
                              disabled={loading || Boolean(category.deletedAt)}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleActive(category)}
                              disabled={loading || Boolean(category.deletedAt)}
                              className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs font-medium text-yellow-700 transition hover:bg-yellow-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {category.isActive ? "Deactivate" : "Activate"}
                            </button>

                            {!category.deletedAt ? (
                              <button
                                type="button"
                                onClick={() => handleSoftDelete(category)}
                                disabled={loading}
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Delete
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRestore(category)}
                                disabled={loading}
                                className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Restore
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-4 border-t border-zinc-200 p-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-zinc-600">
                Showing {total === 0 ? 0 : (page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, total)} of {total} categories
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1 || loading || tableLoading}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-zinc-400"
                >
                  Previous
                </button>

                <span className="px-2 py-1.5 text-sm text-zinc-600">
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages || loading || tableLoading}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-zinc-400"
                >
                  Next
                </button>

                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm outline-none"
                  disabled={loading || tableLoading}
                >
                  <option value={5}>5/page</option>
                  <option value={10}>10/page</option>
                  <option value={20}>20/page</option>
                  <option value={50}>50/page</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5">
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold ${getModalIconStyle()}`}
              >
                {getModalIcon()}
              </div>

              <h3 className="text-lg font-semibold text-zinc-900">
                {confirmModal.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {confirmModal.message}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeConfirmModal}
                disabled={loading}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => confirmModal.onConfirm?.()}
                disabled={loading}
                className={`rounded-lg px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60 ${getModalButtonStyle()}`}
              >
                {loading ? "Processing..." : confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}