"use client";

import { FormEvent, useEffect, useState } from "react";
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

type Category = {
  id: string;
  name: string;
  children?: Category[];
};

const levels: CourseLevel[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

function flattenCategories(categories: Category[]): Category[] {
  const result: Category[] = [];

  const walk = (items: Category[]) => {
    items.forEach((item) => {
      result.push(item);
      if (item.children?.length) {
        walk(item.children);
      }
    });
  };

  walk(categories);
  return result;
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

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchCategories() {
    try {
      setCategoryLoading(true);
      const response = await api.get("/v1/courses/public/category-tree");
      const payload = unwrapData<Category[]>(response);
      setCategories(flattenCategories(Array.isArray(payload) ? payload : []));
    } catch {
      setCategories([]);
    } finally {
      setCategoryLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!categoryId) {
      setError("Please choose a category.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await instructorCourseService.createCourse({
        title,
        shortDescription,
        description: description || undefined,
        level,
        price: price ? Number(price) : undefined,
        language: language || undefined,
        certificateEnabled,
        categoryIds: [categoryId],
      });

      const createdCourse = unwrapData<any>(response);
      router.push(`/instructor/courses/${createdCourse.id}/curriculum`);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create course.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Create Draft Course</CardTitle>
          <CardDescription>
            Create the basic information first. After that, you can add sections
            and lessons.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {Array.isArray(error) ? error.join(", ") : error}
            </div>
          )}

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
              <label className="text-sm font-medium">Short description</label>
              <Textarea
                value={shortDescription}
                onChange={(event) => setShortDescription(event.target.value)}
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
                  onChange={(event) => setLevel(event.target.value as CourseLevel)}
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
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Price</label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="49.99"
                />
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

              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Draft Course"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}