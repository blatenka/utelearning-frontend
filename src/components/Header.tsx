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
          <Link href="/dashboard" className="px-4 py-2 rounded-md bg-zinc-100 text-sm font-medium hover:bg-zinc-200 transition-colors">
            Home
          </Link>
          
          {loading ? (
            <span className="text-sm text-zinc-500">Loading...</span>
          ) : !user ? (
            <Link href="/auth" className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
              Login / Register
            </Link>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-700">{user.fullName}</span>
                <UserMenu user={user} />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}