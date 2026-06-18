"use client";

import Link from "next/link";
import { BookOpen, PlusCircle, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";
import RoleGuard from "@/components/RoleGuard";

export default function InstructorDashboardPage() {
  const { user } = useAuth();

  return (
    <RoleGuard allowedRoles={["INSTRUCTOR"]}>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Instructor Dashboard
            </h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.fullName}. Manage your courses and build your
              learning content.
            </p>
          </div>

          <Button asChild>
            <Link href="/instructor/courses/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Course
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                My Courses
              </CardTitle>
              <CardDescription>
                View, edit and manage all courses you created.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/instructor/courses">Manage Courses</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5" />
                Course Builder
              </CardTitle>
              <CardDescription>
                Create sections and lessons for your draft courses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/instructor/courses">Open Course Builder</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </RoleGuard>
  );
}