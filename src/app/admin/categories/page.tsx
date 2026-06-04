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
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  courseCount?: number;
  childrenCount?: number;
};

type FormMode = "create" | "edit" | null;

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
  const [sortBy, setSortBy] = useState<"createdAt" | "name" | "order">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    parentId: "",
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
        params.append("isActive", filterActive.toString());
      }

      if (includeDeleted) {
        params.append("includeDeleted", "true");
      }

      const res = await api.get(`/v1/categories?${params.toString()}`);

      setCategories(res.data?.data?.data || []);
      setTotal(res.data?.data?.meta?.total || 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load categories");
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
    setFormMode(null);
    setSelectedCategoryId(null);
    setFormData({
      name: "",
      description: "",
      parentId: "",
    });
    setError(null);
  };

  const handleNewCategory = () => {
    setFormMode("create");
    setSelectedCategoryId(null);
    setFormData({
      name: "",
      description: "",
      parentId: "",
    });
    setError(null);
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
      name: category.name,
      description: category.description || "",
      parentId: category.parentId || "",
    });

    setError(null);
    setSuccess(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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
          await api.patch(`/v1/categories/${category.id}/soft-delete`);
          setSuccess("Category soft deleted");
          await loadCategories();
          closeConfirmModal();
        } catch (err: any) {
          setError(err?.response?.data?.message || "Delete failed");
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
          await api.patch(`/v1/categories/${category.id}/restore`);
          setSuccess("Category restored");
          await loadCategories();
          closeConfirmModal();
        } catch (err: any) {
          setError(err?.response?.data?.message || "Restore failed");
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
          await api.patch(`/v1/categories/${category.id}/active-status`, {
            isActive: nextStatus,
          });

          setSuccess(`Category ${nextStatus ? "activated" : "deactivated"}`);
          await loadCategories();
          closeConfirmModal();
        } catch (err: any) {
          setError(err?.response?.data?.message || "Update failed");
        } finally {
          setLoading(false);
        }
      },
    });
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

    try {
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

      if (formMode === "create") {
        await api.post("/v1/categories", payload);
        setSuccess("Category created successfully");
      } else if (formMode === "edit" && selectedCategoryId) {
        await api.patch(`/v1/categories/${selectedCategoryId}`, payload);
        setSuccess("Category updated successfully");
      }

      resetForm();
      setPage(1);
      await loadCategories();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Save failed");
    } finally {
      setLoading(false);
    }
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
    return <div className="p-6 text-center text-red-500">Access denied. Admins only.</div>;
  }

  return (
    <>
      <div className="space-y-6 p-6">
        <div className="rounded bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Admin — Categories</h2>
              <p className="text-sm text-zinc-600">Manage course categories</p>
            </div>

            <button
              type="button"
              onClick={handleNewCategory}
              disabled={loading}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              + New Category
            </button>
          </div>

          {error && <div className="mb-4 rounded bg-red-100 p-4 text-red-800">{error}</div>}

          {success && (
            <div className="mb-4 rounded bg-green-100 p-4 text-green-800">{success}</div>
          )}

          {formMode && (
            <form onSubmit={handleSubmit} className="mb-6 rounded border bg-zinc-50 p-4">
              <h3 className="mb-4 text-lg font-semibold">
                {formMode === "create" ? "New Category" : "Edit Category"}
              </h3>

              <div className="mb-4 grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="font-medium">Category Name *</span>
                  <input
                    type="text"
                    className="w-full rounded border p-2"
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

                <label className="space-y-1 text-sm">
                  <span className="font-medium">Parent Category Optional</span>
                  <select
                    className="w-full rounded border p-2"
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
                      .filter((category) => category.id !== selectedCategoryId && !category.parentId)
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              <label className="w-full space-y-1 text-sm">
                <span className="font-medium">Description</span>
                <textarea
                  className="w-full rounded border p-2"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  disabled={loading}
                />
              </label>

              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {loading ? "Saving..." : "Save"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={loading}
                  className="rounded bg-gray-300 px-4 py-2 text-sm hover:bg-gray-400 disabled:cursor-not-allowed disabled:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="mb-6 grid gap-4 sm:grid-cols-4">
            <input
              type="text"
              placeholder="Search categories..."
              className="rounded border p-2 text-sm"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />

            <select
              className="rounded border p-2 text-sm"
              value={filterActive === "all" ? "all" : String(filterActive)}
              onChange={(e) => {
                setFilterActive(e.target.value === "all" ? "all" : e.target.value === "true");
                setPage(1);
              }}
            >
              <option value="all">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>

            <label className="flex items-center gap-2 text-sm">
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
              className="rounded border p-2 text-sm"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split("-");

                setSortBy(field as "createdAt" | "name" | "order");
                setSortOrder(order as "asc" | "desc");
                setPage(1);
              }}
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="order-asc">Order Asc</option>
              <option value="order-desc">Order Desc</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-zinc-100">
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Slug</th>
                  <th className="p-2 text-left">Parent</th>
                  <th className="p-2 text-center">Order</th>
                  <th className="p-2 text-center">Status</th>
                  <th className="p-2 text-center">Courses</th>
                  <th className="p-2 text-center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {tableLoading ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-zinc-500">
                      Loading categories...
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-zinc-500">
                      No categories found
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr key={category.id} className="border-b hover:bg-zinc-50">
                      <td className="p-2 font-medium">
                        {category.name}
                        {category.deletedAt && (
                          <span className="ml-2 text-red-500">[DELETED]</span>
                        )}
                      </td>

                      <td className="p-2 text-xs text-zinc-600">{category.slug}</td>

                      <td className="p-2 text-sm">{category.parentName || "-"}</td>

                      <td className="p-2 text-center">{category.order}</td>

                      <td className="p-2 text-center">
                        <span
                          className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                            category.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {category.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="p-2 text-center">{category.courseCount || 0}</td>

                      <td className="space-x-2 p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleEdit(category)}
                          disabled={loading}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleActive(category)}
                          disabled={loading}
                          className="text-xs font-medium text-yellow-600 hover:text-yellow-800 disabled:text-gray-400"
                        >
                          {category.isActive ? "Deactivate" : "Activate"}
                        </button>

                        {!category.deletedAt ? (
                          <button
                            type="button"
                            onClick={() => handleSoftDelete(category)}
                            disabled={loading}
                            className="text-xs font-medium text-red-600 hover:text-red-800 disabled:text-gray-400"
                          >
                            Delete
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRestore(category)}
                            disabled={loading}
                            className="text-xs font-medium text-orange-600 hover:text-orange-800 disabled:text-gray-400"
                          >
                            Restore
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-zinc-600">
              Showing {total === 0 ? 0 : (page - 1) * limit + 1} to{" "}
              {Math.min(page * limit, total)} of {total} categories
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1 || loading || tableLoading}
                className="rounded border px-3 py-1 text-sm hover:bg-zinc-100 disabled:bg-gray-100"
              >
                Previous
              </button>

              <span className="px-3 py-1 text-sm">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || loading || tableLoading}
                className="rounded border px-3 py-1 text-sm hover:bg-zinc-100 disabled:bg-gray-100"
              >
                Next
              </button>

              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded border p-1 text-sm"
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

      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5">
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold ${getModalIconStyle()}`}
              >
                {getModalIcon()}
              </div>

              <h3 className="text-lg font-semibold text-zinc-900">{confirmModal.title}</h3>

              <p className="mt-2 text-sm leading-6 text-zinc-600">{confirmModal.message}</p>
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