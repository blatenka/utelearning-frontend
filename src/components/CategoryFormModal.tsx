"use client";
import React, { useState, useEffect } from "react";
import api from "@/lib/api";

type FormData = {
  name: string;
  description: string;
  parentId: string;
};

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  categories?: any[];
}

export default function CategoryFormModal({
  isOpen,
  onClose,
  onSuccess,
  categories = [],
}: CategoryFormModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    parentId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({ name: "", description: "", parentId: "" });
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.name.trim()) {
      setError("Category name is required");
      setLoading(false);
      return;
    }

    try {
      const payload: any = {
        name: formData.name,
        description: formData.description || undefined,
      };

      if (formData.parentId) {
        payload.parentId = formData.parentId;
      }

      await api.post("/vi/admin/courses/categories", payload);
      resetForm();
      handleClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Create New Category</h3>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-zinc-500 hover:text-zinc-700 disabled:opacity-50"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 text-red-800 bg-red-100 rounded text-sm">
                {error}
              </div>
            )}

            <label className="space-y-1 block text-sm">
              <span className="font-medium">Category Name *</span>
              <input
                type="text"
                className="w-full border border-zinc-300 p-2.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                disabled={loading}
                placeholder="Enter category name"
                required
              />
            </label>

            <label className="space-y-1 block text-sm">
              <span className="font-medium">Parent Category (Optional)</span>
              <select
                className="w-full border border-zinc-300 p-2.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.parentId}
                onChange={(e) =>
                  setFormData({ ...formData, parentId: e.target.value })
                }
                disabled={loading}
              >
                <option value="">None (Top-level)</option>
                {categories
                  .filter((c) => !c.parentId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="space-y-1 block text-sm">
              <span className="font-medium">Description</span>
              <textarea
                className="w-full border border-zinc-300 p-2.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                disabled={loading}
                placeholder="Enter category description"
              />
            </label>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t border-zinc-200">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-sm border border-zinc-300 rounded hover:bg-zinc-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
