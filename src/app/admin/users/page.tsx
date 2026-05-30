"use client";
import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

const roleOptions = ["ADMIN", "INSTRUCTOR", "LEARNER", "REVIEWER"] as const;

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "INSTRUCTOR" | "LEARNER" | "REVIEWER">("LEARNER");

  const isAdmin = user?.role === "ADMIN";

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/v1/admin/users");
      setUsers(res.data?.data?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
  }, [isAdmin]);

  const resetForm = () => {
    setFormMode("create");
    setSelectedUserId(null);
    setFullName("");
    setEmail("");
    setPassword("");
    setRole("LEARNER");
    setError(null);
  };

  const handleEdit = (item: any) => {
    setFormMode("edit");
    setSelectedUserId(item.id);
    setFullName(item.fullName || "");
    setEmail(item.email || "");
    setPassword("");
    setRole(item.role || "LEARNER");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this user?")) {
      return;
    }
    setLoading(true);
    try {
      await api.delete(`/v1/admin/users/${id}`);
      await loadUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (formMode === "create") {
        await api.post("/v1/admin/users", { fullName, email, password, role });
      } else if (selectedUserId) {
        await api.patch(`/v1/admin/users/${selectedUserId}`, {
          fullName,
          email,
          password: password || undefined,
          role,
        });
      }
      resetForm();
      await loadUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="p-6 text-center text-zinc-500">Loading...</div>;
  if (!user) return <div className="p-6 text-center text-red-500">Please log in as an admin to view this page.</div>;
  if (!isAdmin) return <div className="p-6 text-center text-red-500">Access denied. Admins only.</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded shadow">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Admin — Users</h2>
            <p className="text-sm text-zinc-600">Create or update users from the admin panel.</p>
          </div>
          <button type="button" onClick={resetForm} className="rounded bg-zinc-100 px-3 py-1 text-sm">
            New user
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Full name</span>
            <input
              className="w-full border p-2 rounded"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Email</span>
            <input
              type="email"
              className="w-full border p-2 rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Password {formMode === "edit" ? "(leave blank to keep current)" : ""}</span>
            <input
              type="password"
              className="w-full border p-2 rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Role</span>
            <select
              className="w-full border p-2 rounded"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              disabled={loading}
            >
              {roleOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button className="rounded bg-primary px-4 py-2 text-white" disabled={loading}>
              {formMode === "create" ? "Create user" : "Update user"}
            </button>
            {formMode === "edit" && (
              <button type="button" onClick={resetForm} className="rounded border px-4 py-2 text-sm">
                Cancel edit
              </button>
            )}
          </div>
          {error && <div className="sm:col-span-2 text-sm text-red-600">{error}</div>}
        </form>
      </div>

      <div className="bg-white p-6 rounded shadow">
        <h3 className="text-lg font-semibold mb-4">Users</h3>
        {loading ? (
          <p>Loading users...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Active</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2">{item.fullName}</td>
                    <td className="px-3 py-2">{item.email}</td>
                    <td className="px-3 py-2">{item.role}</td>
                    <td className="px-3 py-2">{item.isActive ? "Yes" : "No"}</td>
                    <td className="px-3 py-2 space-x-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="rounded border px-3 py-1 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="rounded bg-red-600 px-3 py-1 text-sm text-white"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-sm text-zinc-600">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
