"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  instructorCourseService,
  CourseLevel,
  unwrapData,
} from "@/services/instructor-course.service";
import RoleGuard from "@/components/RoleGuard";

type Category = {
  id: string;
  name: string;
  children?: Category[];
};

type CategoryOption = {
  id: string;
  name: string;
  depth: number;
  isLeaf: boolean;
};

const levels: CourseLevel[] = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCE",
  "ALL_LEVELS",
];

function buildCategoryOptions(
  categories: Category[],
  depth = 0
): CategoryOption[] {
  return categories.flatMap((category) => {
    const children = category.children || [];

    const option: CategoryOption = {
      id: category.id,
      name: category.name,
      depth,
      isLeaf: children.length === 0,
    };

    return [option, ...buildCategoryOptions(children, depth + 1)];
  });
}

function getErrorMessage(err: unknown, fallback: string) {
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof (err as any).response?.data?.message === "string"
  ) {
    return (err as any).response.data.message;
  }

  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    Array.isArray((err as any).response?.data?.message)
  ) {
    return (err as any).response.data.message.join(", ");
  }

  if (err instanceof Error) {
    return err.message;
  }

  return fallback;
}

function formatCategoryLabel(option: CategoryOption) {
  const prefix = option.depth > 0 ? `${" ".repeat(option.depth)}` : "";
  const suffix = option.isLeaf ? "" : " (Parent Group)";
  return `${prefix}${option.name}${suffix}`;
}

export default function CreateInstructorCoursePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<CourseLevel>("BEGINNER");
  const [price, setPrice] = useState("");
  const [language, setLanguage] = useState("English");
  const [certificateEnabled, setCertificateEnabled] = useState(true);
  const [categoryId, setCategoryId] = useState("");

  const [categoryTree, setCategoryTree] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);

  const [errorModalMessage, setErrorModalMessage] = useState<string | null>(
    null
  );

  const categoryOptions = useMemo(() => {
    return buildCategoryOptions(categoryTree);
  }, [categoryTree]);

  const selectedCategory = useMemo(() => {
    return categoryOptions.find((category) => category.id === categoryId);
  }, [categoryOptions, categoryId]);

  function showError(message: string) {
    setErrorModalMessage(message);
  }

  async function fetchCategories() {
    try {
      setCategoryLoading(true);

      const response = await api.get("/v1/courses/public/category-tree");
      const payload = unwrapData<Category[]>(response);

      setCategoryTree(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setCategoryTree([]);
      showError(getErrorMessage(err, "Failed to load categories."));
    } finally {
      setCategoryLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!categoryId) {
      showError("Please choose a category.");
      return;
    }

    if (!selectedCategory?.isLeaf) {
      showError("Please choose a child category, not a parent group.");
      return;
    }

    if (price !== "" && Number(price) < 0) {
      showError("Price must be greater than or equal to 0.");
      return;
    }

    try {
      setLoading(true);

      const response = await instructorCourseService.createCourse({
        title: title.trim(),
        shortDescription: shortDescription.trim(),
        description: description.trim() || undefined,
        level,
        price: price === "" ? undefined : Number(price),
        language: language.trim() || undefined,
        certificateEnabled,
        categoryIds: [categoryId],
      });

      const createdCourse = unwrapData<any>(response);

      router.push(`/instructor/courses/${createdCourse.id}/curriculum`);
    } catch (err) {
      showError(getErrorMessage(err, "Failed to create course."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <RoleGuard allowedRoles={["INSTRUCTOR"]}>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Create Draft Course</CardTitle>
            <CardDescription>
              Create the basic information first. After that, you can add
              sections, lessons, and assessments.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Course title</label>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="NestJS Masterclass"
                  required
                  minLength={3}
                  maxLength={255}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Short description
                </label>
                <Textarea
                  value={shortDescription}
                  onChange={(event) =>
                    setShortDescription(event.target.value)
                  }
                  placeholder="Learn how to build production-ready APIs with NestJS."
                  required
                  minLength={10}
                  maxLength={500}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Full course description..."
                  rows={6}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Level</label>
                  <select
                    value={level}
                    onChange={(event) =>
                      setLevel(event.target.value as CourseLevel)
                    }
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    {levels.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <select
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    disabled={categoryLoading}
                    required
                  >
                    <option value="">
                      {categoryLoading ? "Loading..." : "Choose category"}
                    </option>

                    {categoryOptions.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                        disabled={!category.isLeaf}
                      >
                        {formatCategoryLabel(category)}
                      </option>
                    ))}
                  </select>

                  <p className="text-xs text-muted-foreground">
                    Parent groups are disabled. Please choose a child category.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price (VND)</label>
                  <Input
                    type="number"
                    min={0}
                    step={10000}
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    placeholder="100000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the price in Vietnamese dong. Leave empty for free.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Language</label>
                  <Input
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    placeholder="English"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={certificateEnabled}
                  onChange={(event) =>
                    setCertificateEnabled(event.target.checked)
                  }
                />
                Enable certificate
              </label>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/instructor/courses")}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={loading || categoryLoading}>
                  {loading ? "Creating..." : "Create Draft Course"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {errorModalMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Something went wrong
              </h2>

              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
                {errorModalMessage}
              </p>

              <div className="mt-6 flex justify-end">
                <Button
                  type="button"
                  onClick={() => setErrorModalMessage(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </RoleGuard>
  );
}