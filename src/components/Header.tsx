"use client";
import Link from "next/link";
import React from "react";
import { useAuth } from "@/providers/AuthProvider";
import UserMenu from "./UserMenu";

export default function Header() {
  const { user, loading } = useAuth();

  return (
    <header className="w-full border-b border-zinc-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <Link href="/">
            <span className="text-lg font-semibold">UT-Elearning</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm">
            Dashboard
          </Link>
          {loading ? (
            <span className="text-sm text-zinc-500">Loading...</span>
          ) : !user ? (
            <Link href="/auth" className="text-sm text-primary">
              Login / Register
            </Link>
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Hi, {user.fullName}</span>
              {user.role === "ADMIN" && (
                <Link href="/admin/users" className="rounded-md bg-primary px-3 py-1 text-sm text-white">
                  Admin
                </Link>
              )}
              <UserMenu user={user} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
