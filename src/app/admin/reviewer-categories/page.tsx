"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import {
  adminReviewerCategoryService,
  flattenCategories,
  unwrapData,
  unwrapList,
} from "@/services/review.service";

import type {
  AdminCourseCategory,
  AdminUser,
  ReviewerCategoryAuthorizations,
} from "@/services/review.service";

export default function AdminReviewerCategoriesPage() {
  const { user, loading: authLoading } = useAuth();

  const [reviewers, setReviewers] = useState<AdminUser[]>([]);
  const [categories, setCategories] = useState<AdminCourseCategory[]>([]);

  const [selectedReviewerId, setSelectedReviewerId] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const [reviewerSearch, setReviewerSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [authorizationLoading, setAuthorizationLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedReviewer = reviewers.find(
    (reviewer) => reviewer.id === selectedReviewerId
  );

  const filteredReviewers = useMemo(() => {
    const keyword = reviewerSearch.trim().toLowerCase();

    return reviewers.filter((reviewer) => {
      const isReviewer = reviewer.role === "REVIEWER";

      if (!keyword) return isReviewer;

      return (
        isReviewer &&
        `${reviewer.fullName} ${reviewer.email}`
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [reviewers, reviewerSearch]);

  const filteredCategories = useMemo(() => {
    const keyword = categorySearch.trim().toLowerCase();

    return categories.filter((category) => {
      if (!keyword) return true;

      return `${category.name} ${category.slug}`
        .toLowerCase()
        .includes(keyword);
    });
  }, [categories, categorySearch]);

  async function fetchInitialData() {
    try {
      setLoading(true);
      setError("");

      const [reviewerResponse, categoryResponse] = await Promise.all([
        adminReviewerCategoryService.getReviewers(),
        adminReviewerCategoryService.getCategories(),
      ]);

      const reviewerList = unwrapList<AdminUser>(reviewerResponse).filter(
        (item) => item.role === "REVIEWER"
      );

      const rawCategories = unwrapList<AdminCourseCategory>(categoryResponse);
      const flatCategories = flattenCategories(rawCategories);

      setReviewers(reviewerList);
      setCategories(flatCategories);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to load reviewers and categories."
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchReviewerAuthorizations(reviewerId: string) {
    if (!reviewerId) {
      setSelectedCategoryIds([]);
      return;
    }

    try {
      setAuthorizationLoading(true);
      setError("");
      setSuccessMessage("");

      const response =
        await adminReviewerCategoryService.getReviewerCategories(reviewerId);

      const payload =
        unwrapData<ReviewerCategoryAuthorizations>(response);

      setSelectedCategoryIds(
        Array.isArray(payload?.categories)
          ? payload.categories.map((category) => category.id)
          : []
      );
    } catch (err: any) {
      setSelectedCategoryIds([]);
      setError(
        err?.response?.data?.message ||
          "Failed to load reviewer category authorizations."
      );
    } finally {
      setAuthorizationLoading(false);
    }
  }

  function handleSelectReviewer(reviewerId: string) {
    setSelectedReviewerId(reviewerId);
    fetchReviewerAuthorizations(reviewerId);
  }

  function toggleCategory(categoryId: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  }

  async function handleSave() {
    if (!selectedReviewerId) {
      setError("Please select a reviewer first.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      await adminReviewerCategoryService.replaceReviewerCategories(
        selectedReviewerId,
        {
          categoryIds: selectedCategoryIds,
        }
      );

      setSuccessMessage("Reviewer category authorizations saved successfully.");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to save reviewer category authorizations."
      );
    } finally {
      setSaving(false);
    }
  }

  function clearAll() {
    setSelectedCategoryIds([]);
  }

  function selectAllVisible() {
    const visibleIds = filteredCategories.map((category) => category.id);

    setSelectedCategoryIds((prev) =>
      Array.from(new Set([...prev, ...visibleIds]))
    );
  }

  useEffect(() => {
    if (!authLoading && user?.role === "ADMIN") {
      fetchInitialData();
    }
  }, [authLoading, user?.role]);

  if (authLoading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-sm text-zinc-500">Loading...</p>
      </main>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-zinc-900">
            Access denied
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            You need to sign in as an admin to access this page.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Reviewer Category Authorizations
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Assign course categories that each reviewer is allowed to review.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!selectedReviewerId || saving}
          className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Authorizations"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {Array.isArray(error) ? error.join(", ") : error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading data...</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b p-5">
              <h2 className="text-lg font-semibold text-zinc-900">
                Reviewers
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Choose a reviewer to manage category permissions.
              </p>

              <input
                value={reviewerSearch}
                onChange={(event) => setReviewerSearch(event.target.value)}
                placeholder="Search reviewer..."
                className="mt-4 h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>

            <div className="max-h-[620px] overflow-y-auto p-2">
              {filteredReviewers.length === 0 ? (
                <p className="p-3 text-sm text-zinc-500">
                  No reviewers found.
                </p>
              ) : (
                filteredReviewers.map((reviewer) => {
                  const active = reviewer.id === selectedReviewerId;

                  return (
                    <button
                      key={reviewer.id}
                      type="button"
                      onClick={() => handleSelectReviewer(reviewer.id)}
                      className={`block w-full rounded-xl px-3 py-3 text-left transition ${
                        active
                          ? "bg-zinc-900 text-white"
                          : "hover:bg-zinc-100"
                      }`}
                    >
                      <p className="truncate text-sm font-semibold">
                        {reviewer.fullName}
                      </p>
                      <p
                        className={`truncate text-xs ${
                          active ? "text-zinc-300" : "text-zinc-500"
                        }`}
                      >
                        {reviewer.email}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">
                    Authorized Categories
                  </h2>

                  {selectedReviewer ? (
                    <p className="mt-1 text-sm text-zinc-500">
                      Managing permissions for{" "}
                      <span className="font-medium text-zinc-900">
                        {selectedReviewer.fullName}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-zinc-500">
                      Select a reviewer on the left first.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={selectAllVisible}
                    disabled={!selectedReviewerId}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Select Visible
                  </button>

                  <button
                    type="button"
                    onClick={clearAll}
                    disabled={!selectedReviewerId}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <input
                  value={categorySearch}
                  onChange={(event) => setCategorySearch(event.target.value)}
                  placeholder="Search category..."
                  className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                />

                <p className="text-sm text-zinc-500">
                  Selected:{" "}
                  <span className="font-semibold text-zinc-900">
                    {selectedCategoryIds.length}
                  </span>
                </p>
              </div>
            </div>

            <div className="p-5">
              {!selectedReviewerId ? (
                <div className="rounded-xl border border-dashed p-8 text-center">
                  <p className="text-sm text-zinc-500">
                    Please select a reviewer to view or update category
                    authorizations.
                  </p>
                </div>
              ) : authorizationLoading ? (
                <p className="text-sm text-zinc-500">
                  Loading reviewer permissions...
                </p>
              ) : filteredCategories.length === 0 ? (
                <p className="text-sm text-zinc-500">No categories found.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {filteredCategories.map((category) => {
                    const checked = selectedCategoryIds.includes(category.id);
                    const inactive = category.isActive === false;

                    return (
                      <label
                        key={category.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                          checked
                            ? "border-zinc-900 bg-zinc-50"
                            : "border-zinc-200 hover:bg-zinc-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCategory(category.id)}
                          className="mt-1"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-zinc-900">
                              {category.name}
                            </p>

                            {inactive && (
                              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                                Inactive
                              </span>
                            )}
                          </div>

                          <p className="truncate text-xs text-zinc-500">
                            {category.slug}
                          </p>

                          {category.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}