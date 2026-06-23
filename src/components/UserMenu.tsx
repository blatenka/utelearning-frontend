"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

export default function UserMenu({ user }: { user: any }) {
  const router = useRouter();
  const { logout } = useAuth();

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === "ADMIN";
  const isInstructor = user?.role === "INSTRUCTOR";
  const isReviewer = user?.role === "REVIEWER";
  const isLearner = user?.role === "LEARNER";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  function navigateTo(path: string) {
    setOpen(false);
    router.push(path);
  }

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.push("/");
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex cursor-pointer items-center rounded-full border border-zinc-200 bg-white p-1 shadow-sm transition-all hover:bg-zinc-50"
        title={user.fullName}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.fullName}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-300 text-xs font-semibold text-zinc-700">
            {user.fullName?.charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      <div
        className={`absolute right-0 z-20 mt-2 w-64 origin-top-right rounded-xl border border-zinc-200/80 bg-white/95 p-1.5 shadow-xl backdrop-blur-md transition-all duration-200 ${
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-95 opacity-0"
        }`}
      >
        <div className="px-3 py-2">
          <p className="truncate text-sm font-semibold text-zinc-900">
            {user.fullName}
          </p>
          <p className="truncate text-xs text-zinc-500">{user.email}</p>
          <p className="mt-1 text-xs font-medium text-zinc-400">{user.role}</p>
        </div>

        <div className="my-1 border-t border-zinc-200" />

        <button
          type="button"
          className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-100"
          onClick={() => navigateTo("/profile")}
        >
          Profile
        </button>

        {(isLearner || user) && (
          <button
            type="button"
            className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-indigo-600 transition-colors hover:bg-zinc-100"
            onClick={() => navigateTo("/my-learning")}
          >
            My Learning
          </button>
        )}

        {isAdmin && (
          <>
            <div className="my-1 border-t border-zinc-200" />

            <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Admin
            </p>

            <button
              type="button"
              className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-blue-600 transition-colors hover:bg-zinc-100"
              onClick={() => navigateTo("/admin/users")}
            >
              User Management
            </button>

            <button
              type="button"
              className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-blue-600 transition-colors hover:bg-zinc-100"
              onClick={() => navigateTo("/admin/categories")}
            >
              Categories Management
            </button>

            <button
              type="button"
              className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-blue-600 transition-colors hover:bg-zinc-100"
              onClick={() => navigateTo("/admin/reviewer-categories")}
            >
              Reviewer Categories
            </button>
          </>
        )}

        {isInstructor && (
          <>
            <div className="my-1 border-t border-zinc-200" />

            <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Instructor
            </p>

            <button
              type="button"
              className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-emerald-600 transition-colors hover:bg-zinc-100"
              onClick={() => navigateTo("/instructor")}
            >
              Instructor Dashboard
            </button>

            <button
              type="button"
              className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-emerald-600 transition-colors hover:bg-zinc-100"
              onClick={() => navigateTo("/instructor/courses")}
            >
              My Courses
            </button>

            <button
              type="button"
              className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-emerald-600 transition-colors hover:bg-zinc-100"
              onClick={() => navigateTo("/instructor/courses/new")}
            >
              Create Course
            </button>
          </>
        )}

        {isReviewer && (
          <>
            <div className="my-1 border-t border-zinc-200" />

            <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Reviewer
            </p>

            <button
              type="button"
              className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-purple-600 transition-colors hover:bg-zinc-100"
              onClick={() => navigateTo("/reviewer")}
            >
              Reviewer Dashboard
            </button>

            <button
              type="button"
              className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-purple-600 transition-colors hover:bg-zinc-100"
              onClick={() => navigateTo("/reviewer/courses/available")}
            >
              Available Courses
            </button>

            <button
              type="button"
              className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-purple-600 transition-colors hover:bg-zinc-100"
              onClick={() => navigateTo("/reviewer/courses")}
            >
              My Review Tasks
            </button>
          </>
        )}

        <div className="my-1 border-t border-zinc-200" />

        <button
          type="button"
          className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </div>
  );
}