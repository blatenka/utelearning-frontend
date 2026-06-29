"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import RoleGuard from "@/components/RoleGuard";
import {
  adminCourseCategoryService,
  AdminCategorySortBy,
  AdminCategorySortOrder,
  AdminCourseCategory,
  normalizeAdminCategory,
} from "@/services/admin-course-category.service";

type FormMode = "create" | "edit";

type ConfirmModalState = {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  variant: "danger" | "warning" | "success";
  onConfirm: (() => Promise<void>) | null;
};

type AlertModalState = {
  open: boolean;
  title: string;
  message: string;
  variant: "success" | "error" | "info" | "warning";
};

type DetailModalState = {
  open: boolean;
  category: AdminCourseCategory | null;
};

export default function AdminCategoriesPage() {
  const { user, loading: authLoading } = useAuth();

  const [categories, setCategories] = useState<AdminCourseCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | "all">("all");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [sortBy, setSortBy] = useState<AdminCategorySortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<AdminCategorySortOrder>("desc");

  const [formModalOpen, setFormModalOpen] = useState(false);
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

  const [alertModal, setAlertModal] = useState<AlertModalState>({
    open: false,
    title: "",
    message: "",
    variant: "info",
  });

  const [detailModal, setDetailModal] = useState<DetailModalState>({
    open: false,
    category: null,
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

  const showAlertModal = (
    title: string,
    message: string,
    variant: AlertModalState["variant"] = "info"
  ) => {
    setAlertModal({
      open: true,
      title,
      message,
      variant,
    });
  };

  const closeAlertModal = () => {
    setAlertModal({
      open: false,
      title: "",
      message: "",
      variant: "info",
    });
  };

  const openDetailModal = (category: AdminCourseCategory) => {
    setDetailModal({
      open: true,
      category,
    });
  };

  const closeDetailModal = () => {
    setDetailModal({
      open: false,
      category: null,
    });
  };

  const loadCategories = async () => {
    setTableLoading(true);
    setError(null);

    try {
      const response = await adminCourseCategoryService.getCategories({
        page,
        limit,
        search,
        isActive: filterActive,
        includeDeleted,
        sortBy,
        sortOrder,
      });

      setCategories(response.data);
      setTotal(response.meta.total);
    } catch (err: any) {
      const message = getErrorMessage(err, "Failed to load categories");

      setError(message);
      showAlertModal("Failed to load categories", message, "error");
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    loadCategories();
  }, [
    isAdmin,
    page,
    limit,
    search,
    filterActive,
    includeDeleted,
    sortBy,
    sortOrder,
  ]);

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

  const openCreateModal = () => {
    resetForm();
    setFormMode("create");
    setFormModalOpen(true);
  };

  const openEditModal = (category: AdminCourseCategory) => {
    const normalizedCategory = normalizeAdminCategory(category);

    setFormMode("edit");
    setSelectedCategoryId(normalizedCategory.id);

    setFormData({
      name: normalizedCategory.name || "",
      description: normalizedCategory.description || "",
      parentId: normalizedCategory.parentId || "",
      order: String(normalizedCategory.order ?? 0),
      isActive: normalizedCategory.isActive ? "true" : "false",
    });

    setError(null);
    setFormModalOpen(true);
  };

  const closeFormModal = () => {
    if (loading) return;

    setFormModalOpen(false);
    resetForm();
  };

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
    return {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      parentId: formData.parentId || null,
      order: Number(formData.order),
      isActive: formData.isActive === "true",
    };
  };

  const setErrorWithModal = (title: string, message: string) => {
    setError(message);
    showAlertModal(title, message, "error");
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      const message = "Category name is required";

      setError(message);
      showAlertModal("Validation error", message, "warning");
      return false;
    }

    if (formData.name.trim().length > 100 && formMode === "create") {
      const message = "Category name must be shorter than 100 characters";

      setError(message);
      showAlertModal("Validation error", message, "warning");
      return false;
    }

    if (formData.description.trim().length > 500 && formMode === "create") {
      const message = "Description must be shorter than 500 characters";

      setError(message);
      showAlertModal("Validation error", message, "warning");
      return false;
    }

    if (formMode === "edit" && Number.isNaN(Number(formData.order))) {
      const message = "Order must be a number";

      setError(message);
      showAlertModal("Validation error", message, "warning");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);
    setError(null);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      if (formMode === "create") {
        await adminCourseCategoryService.createCategory(buildCreatePayload());

        setFormModalOpen(false);
        resetForm();
        setPage(1);
        await loadCategories();

        showAlertModal(
          "Category created",
          "The category has been created successfully.",
          "success"
        );
      }

      if (formMode === "edit" && selectedCategoryId) {
        await adminCourseCategoryService.updateCategory(
          selectedCategoryId,
          buildUpdatePayload()
        );

        setFormModalOpen(false);
        resetForm();
        await loadCategories();

        showAlertModal(
          "Category updated",
          "The category has been updated successfully.",
          "success"
        );
      }
    } catch (err: any) {
      const message = getErrorMessage(err, "Save failed");

      setErrorWithModal("Save failed", message);
    } finally {
      setLoading(false);
    }
  };

  const handleSoftDelete = (category: AdminCourseCategory) => {
    setConfirmModal({
      open: true,
      title: "Delete category?",
      message: `Are you sure you want to delete "${category.name}"? This category will be soft deleted and can be restored later.`,
      confirmText: "Delete",
      variant: "danger",
      onConfirm: async () => {
        setLoading(true);
        setError(null);

        try {
          await adminCourseCategoryService.softDeleteCategory(category.id);

          if (selectedCategoryId === category.id) {
            resetForm();
          }

          await loadCategories();
          closeConfirmModal();

          showAlertModal(
            "Category deleted",
            "The category has been soft deleted successfully.",
            "success"
          );
        } catch (err: any) {
          const message = getErrorMessage(err, "Delete failed");

          setErrorWithModal("Delete failed", message);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleRestore = (category: AdminCourseCategory) => {
    setConfirmModal({
      open: true,
      title: "Restore category?",
      message: `Are you sure you want to restore "${category.name}"? This category will become available again.`,
      confirmText: "Restore",
      variant: "success",
      onConfirm: async () => {
        setLoading(true);
        setError(null);

        try {
          await adminCourseCategoryService.restoreCategory(category.id);

          await loadCategories();
          closeConfirmModal();

          showAlertModal(
            "Category restored",
            "The category has been restored successfully.",
            "success"
          );
        } catch (err: any) {
          const message = getErrorMessage(err, "Restore failed");

          setErrorWithModal("Restore failed", message);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleToggleActive = (category: AdminCourseCategory) => {
    const normalizedCategory = normalizeAdminCategory(category);
    const nextStatus = !normalizedCategory.isActive;

    setConfirmModal({
      open: true,
      title: nextStatus ? "Activate category?" : "Deactivate category?",
      message: nextStatus
        ? `Are you sure you want to activate "${normalizedCategory.name}"?`
        : `Are you sure you want to deactivate "${normalizedCategory.name}"? Learners may not be able to see this category.`,
      confirmText: nextStatus ? "Activate" : "Deactivate",
      variant: nextStatus ? "success" : "warning",
      onConfirm: async () => {
        setLoading(true);
        setError(null);

        try {
          await adminCourseCategoryService.updateActiveStatus(
            normalizedCategory.id,
            nextStatus
          );

          if (selectedCategoryId === normalizedCategory.id) {
            setFormData((prev) => ({
              ...prev,
              isActive: String(nextStatus),
            }));
          }

          await loadCategories();
          closeConfirmModal();

          showAlertModal(
            nextStatus ? "Category activated" : "Category deactivated",
            nextStatus
              ? "The category has been activated successfully."
              : "The category has been deactivated successfully.",
            "success"
          );
        } catch (err: any) {
          const message = getErrorMessage(err, "Update failed");

          setErrorWithModal("Update failed", message);
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

  const getAlertIconStyle = () => {
    if (alertModal.variant === "success") {
      return "bg-green-100 text-green-700";
    }

    if (alertModal.variant === "error") {
      return "bg-red-100 text-red-700";
    }

    if (alertModal.variant === "warning") {
      return "bg-yellow-100 text-yellow-700";
    }

    return "bg-blue-100 text-blue-700";
  };

  const getAlertButtonStyle = () => {
    if (alertModal.variant === "success") {
      return "bg-green-600 hover:bg-green-700";
    }

    if (alertModal.variant === "error") {
      return "bg-red-600 hover:bg-red-700";
    }

    if (alertModal.variant === "warning") {
      return "bg-yellow-600 hover:bg-yellow-700";
    }

    return "bg-blue-600 hover:bg-blue-700";
  };

  const getAlertIcon = () => {
    if (alertModal.variant === "success") {
      return <CheckCircle2 className="h-6 w-6" />;
    }

    if (alertModal.variant === "error") {
      return <XCircle className="h-6 w-6" />;
    }

    if (alertModal.variant === "warning") {
      return <AlertTriangle className="h-6 w-6" />;
    }

    return <Info className="h-6 w-6" />;
  };

  if (authLoading) {
    return <div className="p-6 text-center text-zinc-500">Loading...</div>;
  }

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <>
        <div className="min-h-screen bg-zinc-50 p-6">
          <div className="mx-auto max-w-[1300px] space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-zinc-900">
                    Admin — Categories
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600">
                    Search, filter, create, edit and manage course categories.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreateModal}
                  disabled={loading}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  + New Category
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-200 p-6">
                <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-zinc-900">
                      Category Datatable
                    </h3>
                    <p className="text-sm text-zinc-500">
                      Showing category information returned from the category API.
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
                      const value = e.target.value;

                      if (value === "all") {
                        setFilterActive("all");
                      } else if (value === "true") {
                        setFilterActive(true);
                      } else if (value === "false") {
                        setFilterActive(false);
                      }

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

                      setSortBy(field as AdminCategorySortBy);
                      setSortOrder(order as AdminCategorySortOrder);
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
                <table className="w-full min-w-[980px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                      <th className="px-4 py-3 text-left font-semibold">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Slug
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Description
                      </th>
                      <th className="px-4 py-3 text-center font-semibold">
                        Order
                      </th>
                      <th className="px-4 py-3 text-center font-semibold">
                        Status
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
                          colSpan={6}
                          className="px-4 py-8 text-center text-zinc-500"
                        >
                          Loading categories...
                        </td>
                      </tr>
                    ) : categories.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
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
                            selectedCategoryId === category.id
                              ? "bg-blue-50/60"
                              : ""
                          } ${category.deletedAt ? "opacity-75" : ""}`}
                        >
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

                          <td className="max-w-[360px] truncate px-4 py-3 text-zinc-600">
                            {category.description || "-"}
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

                          <td className="px-4 py-3">
                            <div className="flex justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => openDetailModal(category)}
                                disabled={loading}
                                className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Info
                              </button>

                              <button
                                type="button"
                                onClick={() => openEditModal(category)}
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

        {formModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <form onSubmit={handleSubmit}>
                <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-zinc-900">
                        {formMode === "create"
                          ? "Create Category"
                          : "Edit Category"}
                      </h3>

                      <p className="mt-1 text-sm text-zinc-500">
                        {formMode === "create"
                          ? "Create a new course category."
                          : "Update category name, description, parent, order and active status."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeFormModal}
                      disabled={loading}
                      className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="space-y-5 p-6">
                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="space-y-2 text-sm md:col-span-2">
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

                    <label className="space-y-2 text-sm md:col-span-2">
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
                              category.id !== selectedCategoryId &&
                              !category.deletedAt
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
                          <span className="font-medium text-zinc-700">
                            Order
                          </span>

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
                          <span className="font-medium text-zinc-700">
                            Status
                          </span>

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

                    <label className="space-y-2 text-sm md:col-span-2">
                      <span className="font-medium text-zinc-700">
                        Description
                      </span>

                      <textarea
                        maxLength={formMode === "create" ? 500 : undefined}
                        className="min-h-[120px] w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-zinc-100"
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
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
                    <p className="font-medium text-zinc-800">Category Preview</p>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs text-zinc-500">Name</p>
                        <p className="font-medium text-zinc-800">
                          {formData.name.trim() || "New category"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-zinc-500">Parent</p>
                        <p className="font-medium text-zinc-800">
                          {categories.find(
                            (item) => item.id === formData.parentId
                          )?.name || "Top-level category"}
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
                              {formData.isActive === "true"
                                ? "Active"
                                : "Inactive"}
                            </span>
                          </div>
                        </>
                      )}

                      <div className="md:col-span-2">
                        <p className="text-xs text-zinc-500">Description</p>
                        <p className="line-clamp-3 text-zinc-700">
                          {formData.description.trim() || "No description"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 flex flex-col gap-3 border-t border-zinc-200 bg-white p-6 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeFormModal}
                    disabled={loading}
                    className="rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>

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
                </div>
              </form>
            </div>
          </div>
        )}

        {detailModal.open && detailModal.category && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="border-b border-zinc-200 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-zinc-900">
                      Category Details
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      View full category information returned from the API.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeDetailModal}
                    className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-100"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="space-y-4 p-6">
                <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    i
                  </div>

                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900">
                      {detailModal.category.name || "-"}
                    </p>
                    <p className="truncate text-sm text-zinc-500">
                      {detailModal.category.slug || "-"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-zinc-200 p-4">
                    <p className="text-xs font-medium uppercase text-zinc-500">
                      ID
                    </p>
                    <p className="mt-1 break-all font-mono text-sm text-zinc-800">
                      {detailModal.category.id || "-"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-200 p-4">
                    <p className="text-xs font-medium uppercase text-zinc-500">
                      Slug
                    </p>
                    <p className="mt-1 break-all text-sm text-zinc-800">
                      {detailModal.category.slug || "-"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-200 p-4">
                    <p className="text-xs font-medium uppercase text-zinc-500">
                      Parent ID
                    </p>
                    <p className="mt-1 break-all font-mono text-sm text-zinc-800">
                      {detailModal.category.parentId || "-"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-200 p-4">
                    <p className="text-xs font-medium uppercase text-zinc-500">
                      Parent Name
                    </p>
                    <p className="mt-1 text-sm text-zinc-800">
                      {detailModal.category.parentName || "-"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-200 p-4">
                    <p className="text-xs font-medium uppercase text-zinc-500">
                      Order
                    </p>
                    <p className="mt-1 text-sm text-zinc-800">
                      {detailModal.category.order ?? 0}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-200 p-4">
                    <p className="text-xs font-medium uppercase text-zinc-500">
                      Status
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        detailModal.category.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {detailModal.category.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="rounded-xl border border-zinc-200 p-4">
                    <p className="text-xs font-medium uppercase text-zinc-500">
                      Courses
                    </p>
                    <p className="mt-1 text-sm text-zinc-800">
                      {detailModal.category.courseCount ?? "-"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-200 p-4">
                    <p className="text-xs font-medium uppercase text-zinc-500">
                      Children
                    </p>
                    <p className="mt-1 text-sm text-zinc-800">
                      {detailModal.category.childrenCount ?? "-"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-200 p-4">
                    <p className="text-xs font-medium uppercase text-zinc-500">
                      Created At
                    </p>
                    <p className="mt-1 text-sm text-zinc-800">
                      {formatDateTime(detailModal.category.createdAt)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-200 p-4">
                    <p className="text-xs font-medium uppercase text-zinc-500">
                      Updated At
                    </p>
                    <p className="mt-1 text-sm text-zinc-800">
                      {formatDateTime(detailModal.category.updatedAt)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-200 p-4 md:col-span-2">
                    <p className="text-xs font-medium uppercase text-zinc-500">
                      Deleted At
                    </p>
                    <p className="mt-1 text-sm text-zinc-800">
                      {formatDateTime(detailModal.category.deletedAt)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-200 p-4 md:col-span-2">
                    <p className="text-xs font-medium uppercase text-zinc-500">
                      Description
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-800">
                      {detailModal.category.description || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-t border-zinc-200 p-6">
                <button
                  type="button"
                  onClick={closeDetailModal}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

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

        {alertModal.open && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-5">
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${getAlertIconStyle()}`}
                >
                  {getAlertIcon()}
                </div>

                <h3 className="text-lg font-semibold text-zinc-900">
                  {alertModal.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  {alertModal.message}
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={closeAlertModal}
                  className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${getAlertButtonStyle()}`}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    </RoleGuard>
  );
}