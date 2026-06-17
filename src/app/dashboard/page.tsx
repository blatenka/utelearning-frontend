"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { courseAPI } from "@/lib/api";

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  order?: number;
  courseCount?: number;
  childrenCount?: number;
  children?: Category[];
}

interface Course {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string;
  description?: string | null;
  whatYouWillLearn?: string[] | null;
  requirements?: string[] | null;
  thumbnailUrl?: string | null;
  level?: string;
  price?: number | null;
  language?: string | null;
  durationInMinutes?: number | null;
  certificateEnabled?: boolean;
  status?: string;
  isActive?: boolean;
  publishedAt?: string | Date | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

function normalizeCoursesResponse(responseData: any): Course[] {
  const payload = responseData?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.courses)) return payload.courses;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;

  return [];
}

function normalizeCategoriesResponse(responseData: any): Category[] {
  const payload = responseData?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload?.items)) return payload.items;

  return [];
}

function formatPrice(price?: number | null) {
  if (price === undefined || price === null || price === 0) {
    return "Free";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDuration(minutes?: number | null) {
  if (!minutes) return null;

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;

  if (remainMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainMinutes}m`;
}

function TreeCategoryItem({
  category,
  level,
  selectedCategory,
  onSelect,
}: {
  category: Category;
  level: number;
  selectedCategory: string | null;
  onSelect: (categoryId: string | null) => void;
}) {
  const hasChildren = Boolean(category.children?.length);
  const [open, setOpen] = useState(level === 0);

  return (
    <div>
      <div
        className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
          selectedCategory === category.id
            ? "bg-zinc-900 text-white"
            : "text-zinc-700 hover:bg-zinc-100"
        }`}
        style={{ paddingLeft: `${12 + level * 16}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className={`flex h-5 w-5 items-center justify-center rounded-md transition ${
              selectedCategory === category.id
                ? "hover:bg-white/10"
                : "hover:bg-zinc-200"
            }`}
            aria-label={open ? "Collapse category" : "Expand category"}
          >
            <span
              className={`text-xs transition-transform ${
                open ? "rotate-90" : ""
              }`}
            >
              ›
            </span>
          </button>
        ) : (
          <span className="h-5 w-5" />
        )}

        <button
          type="button"
          onClick={() => onSelect(category.id)}
          className="min-w-0 flex-1 truncate text-left font-medium"
          title={category.name}
        >
          {category.name}
        </button>

        {typeof category.courseCount === "number" &&
          category.courseCount > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                selectedCategory === category.id
                  ? "bg-white/15 text-white"
                  : "bg-zinc-100 text-zinc-500 group-hover:bg-white"
              }`}
            >
              {category.courseCount}
            </span>
          )}
      </div>

      {hasChildren && open && (
        <div className="mt-1 space-y-1">
          {category.children!.map((child) => (
            <TreeCategoryItem
              key={child.id}
              category={child}
              level={level + 1}
              selectedCategory={selectedCategory}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryTree({
  categories,
  selectedCategory,
  onSelect,
}: {
  categories: Category[];
  selectedCategory: string | null;
  onSelect: (categoryId: string | null) => void;
}) {
  return (
    <aside className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900">Categories</h2>

        {selectedCategory && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900"
          >
            Clear
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`mb-2 flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
          selectedCategory === null
            ? "bg-zinc-900 text-white"
            : "text-zinc-700 hover:bg-zinc-100"
        }`}
      >
        All courses
      </button>

      <div className="space-y-1">
        {categories.map((category) => (
          <TreeCategoryItem
            key={category.id}
            category={category}
            level={0}
            selectedCategory={selectedCategory}
            onSelect={onSelect}
          />
        ))}
      </div>
    </aside>
  );
}

function CourseCard({ course }: { course: Course }) {
  const description = course.shortDescription || course.description || "";
  const duration = formatDuration(course.durationInMinutes);

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-zinc-100">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 text-sm font-medium text-zinc-400">
            No image
          </div>
        )}

        {course.price === 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-900 shadow-sm">
            Free
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          {course.level && (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
              {course.level}
            </span>
          )}

          {course.language && (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
              {course.language}
            </span>
          )}

          {duration && (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
              {duration}
            </span>
          )}
        </div>

        <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-zinc-900 transition group-hover:text-indigo-600">
          {course.title}
        </h3>

        <p className="mb-5 line-clamp-2 text-sm leading-6 text-zinc-600">
          {description}
        </p>

        <div className="mt-auto border-t border-zinc-100 pt-4">
          <p className="text-lg font-bold text-zinc-900">
            {formatPrice(course.price)}
          </p>
        </div>
      </div>
    </Link>
  );
}

function CourseSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="aspect-[16/9] animate-pulse bg-zinc-200" />
      <div className="p-5">
        <div className="mb-3 h-5 w-28 animate-pulse rounded bg-zinc-200" />
        <div className="mb-2 h-5 w-full animate-pulse rounded bg-zinc-200" />
        <div className="mb-4 h-5 w-3/4 animate-pulse rounded bg-zinc-200" />
        <div className="mb-2 h-4 w-full animate-pulse rounded bg-zinc-200" />
        <div className="mb-5 h-4 w-2/3 animate-pulse rounded bg-zinc-200" />
        <div className="h-6 w-20 animate-pulse rounded bg-zinc-200" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");

  const selectedCategoryName = useMemo(() => {
    const findCategory = (items: Category[]): Category | null => {
      for (const item of items) {
        if (item.id === selectedCategory) {
          return item;
        }

        if (item.children?.length) {
          const found = findCategory(item.children);
          if (found) return found;
        }
      }

      return null;
    };

    return findCategory(categories)?.name || null;
  }, [categories, selectedCategory]);

  const hasActiveFilters = Boolean(selectedCategory || submittedSearch.trim());

  const sectionTitle = useMemo(() => {
    if (selectedCategoryName && submittedSearch.trim()) {
      return `Search results in ${selectedCategoryName}`;
    }

    if (selectedCategoryName) {
      return selectedCategoryName;
    }

    if (submittedSearch.trim()) {
      return "Search results";
    }

    return "Featured courses";
  }, [selectedCategoryName, submittedSearch]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);

        const res = await courseAPI.getCategoryTree();
        const categoryData = normalizeCategoriesResponse(res.data);

        setCategories(categoryData);
      } catch (error) {
        console.error("Failed to load categories:", error);
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);

        const params: Record<string, string | number> = {
          page: 1,
          limit: 12,
        };

        if (selectedCategory) {
          params.categoryId = selectedCategory;
        }

        if (submittedSearch.trim()) {
          params.search = submittedSearch.trim();
        }

        const res = await courseAPI.getPublicCourses(params);
        const courseData = normalizeCoursesResponse(res.data);

        setCourses(courseData);
      } catch (error) {
        console.error("Failed to load courses:", error);
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, [selectedCategory, submittedSearch]);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedSearch(searchInput.trim());
  }

  function clearSearchInput() {
    setSearchInput("");
  }

  function clearFilters() {
    setSelectedCategory(null);
    setSearchInput("");
    setSubmittedSearch("");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
          <p className="mt-4 text-sm text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <section className="border-b border-zinc-200 bg-[#f7f9fc]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-medium text-indigo-600">
              Online learning
            </p>

            <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
              {user
                ? `Keep learning, ${user.fullName}`
                : "Learn without limits"}
            </h1>

            <p className="mt-4 text-base text-zinc-600 sm:text-lg">
              Discover practical courses and build job-ready skills.
            </p>

            {!user && (
              <div className="mt-6">
                <Link
                  href="/auth?tab=register"
                  className="inline-flex rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  Join for free
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <div className="lg:sticky lg:top-6 lg:self-start">
          {loadingCategories ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="mb-4 h-5 w-24 animate-pulse rounded bg-zinc-200" />
              <div className="space-y-2">
                {[...Array(6)].map((_, index) => (
                  <div
                    key={index}
                    className="h-9 animate-pulse rounded-xl bg-zinc-100"
                  />
                ))}
              </div>
            </div>
          ) : categories.length > 0 ? (
            <CategoryTree
              categories={categories}
              selectedCategory={selectedCategory}
              onSelect={setSelectedCategory}
            />
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
              No categories available.
            </div>
          )}
        </div>

        <section>
          <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <form
              onSubmit={handleSearchSubmit}
              className="flex flex-col gap-3 md:flex-row md:items-center"
            >
              <div className="relative flex-1">
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search courses by title or description..."
                  className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 pr-10 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
                />

                {searchInput && (
                  <button
                    type="button"
                    onClick={clearSearchInput}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                  >
                    ×
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="h-11 rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Search
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-11 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                  Clear filters
                </button>
              )}
            </form>

            {hasActiveFilters && (
              <div className="mt-3 flex flex-wrap gap-2">
                {submittedSearch && (
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                    Search: {submittedSearch}
                  </span>
                )}

                {selectedCategoryName && (
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                    Category: {selectedCategoryName}
                  </span>
                )}
              </div>
            )}

            {searchInput !== submittedSearch && searchInput.trim() && (
              <p className="mt-3 text-xs text-zinc-500">
                Press Enter or click Search to apply your keyword.
              </p>
            )}
          </div>

          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-zinc-900">
                {sectionTitle}
              </h2>
              <p className="text-sm text-zinc-500">
                {loadingCourses
                  ? "Loading courses..."
                  : `${courses.length} courses`}
              </p>
            </div>
          </div>

          {loadingCourses ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, index) => (
                <CourseSkeleton key={index} />
              ))}
            </div>
          ) : courses.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-14 text-center">
              <p className="text-base font-medium text-zinc-700">
                No courses found
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Try another keyword, another category, or check whether the
                course is published and active.
              </p>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}