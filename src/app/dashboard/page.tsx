"use client";
import React from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="bg-white p-6 rounded shadow">
        Loading...
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded shadow">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Dashboard</h2>

        {user && (
          <div className="text-right">
            <div className="font-medium">{user.fullName}</div>
            <div className="text-sm text-zinc-600">{user.email}</div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <p>Welcome to the dashboard. Courses are not yet available.</p>

        {user?.role?.toUpperCase() === "ADMIN" && (
          <p className="mt-4">
            <Link href="/admin/users" className="text-sm text-primary">
              Manage users (Admin)
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}