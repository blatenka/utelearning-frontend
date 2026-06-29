"use client";

import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

const roleOptions = ["ADMIN", "INSTRUCTOR", "LEARNER", "REVIEWER"] as const;
const genderOptions = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"] as const;

type Role = (typeof roleOptions)[number];
type Gender = (typeof genderOptions)[number];

type UserItem = {
  id: string;
  fullName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  dateOfBirth?: string | Date | null;
  gender?: Gender | null;
  avatarUrl?: string | null;
  role?: Role;
  isActive?: boolean;
  emailVerified?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  lastLoginAt?: string | Date | null;
};

type FormMode = "create" | "edit";

type ConfirmModalState = {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  variant: "danger" | "warning" | "success";
  onConfirm: (() => Promise<void>) | null;
};

type ResultModalState = {
  open: boolean;
  title: string;
  message: string;
};

type DetailModalState = {
  open: boolean;
  user: UserItem | null;
};

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [role, setRole] = useState<Role>("LEARNER");
  const [isActive, setIsActive] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<Role | "all">("all");
  const [filterActive, setFilterActive] = useState<boolean | "all">("all");
  const [filterEmailVerified, setFilterEmailVerified] = useState<boolean | "all">(
    "all"
  );

  const [sortBy, setSortBy] = useState<
    "createdAt" | "fullName" | "email" | "role"
  >("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    open: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    variant: "danger",
    onConfirm: null,
  });

  const [resultModal, setResultModal] = useState<ResultModalState>({
    open: false,
    title: "",
    message: "",
  });

  const [detailModal, setDetailModal] = useState<DetailModalState>({
    open: false,
    user: null,
  });

  const isAdmin = user?.role === "ADMIN";

  const formatEnumLabel = (value?: string | null) => {
    if (!value) return "-";

    return value
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatDateInput = (value?: string | Date | null) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toISOString().split("T")[0];
  };

  const formatDateTime = (value?: string | Date | null) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openResultModal = (title: string, message: string) => {
    setResultModal({
      open: true,
      title,
      message,
    });
  };

  const closeResultModal = () => {
    setResultModal({
      open: false,
      title: "",
      message: "",
    });
  };

  const openDetailModal = (item: UserItem) => {
    setDetailModal({
      open: true,
      user: item,
    });
  };

  const closeDetailModal = () => {
    setDetailModal({
      open: false,
      user: null,
    });
  };

  const loadUsers = async () => {
    setTableLoading(true);
    setError(null);

    try {
      const res = await api.get("/v1/admin/users");
      setUsers(res.data?.data?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not load users");
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
  }, [isAdmin]);

  const filteredUsers = useMemo(() => {
    let result = [...users];

    const keyword = search.trim().toLowerCase();

    if (keyword) {
      result = result.filter((item) => {
        const nameValue = item.fullName?.toLowerCase() || "";
        const emailValue = item.email?.toLowerCase() || "";
        const phoneValue = item.phoneNumber?.toLowerCase() || "";
        const roleValue = item.role?.toLowerCase() || "";
        const genderValue = item.gender?.toLowerCase() || "";

        return (
          nameValue.includes(keyword) ||
          emailValue.includes(keyword) ||
          phoneValue.includes(keyword) ||
          roleValue.includes(keyword) ||
          genderValue.includes(keyword)
        );
      });
    }

    if (filterRole !== "all") {
      result = result.filter((item) => item.role === filterRole);
    }

    if (filterActive !== "all") {
      result = result.filter((item) => Boolean(item.isActive) === filterActive);
    }

    if (filterEmailVerified !== "all") {
      result = result.filter(
        (item) => Boolean(item.emailVerified) === filterEmailVerified
      );
    }

    result.sort((a, b) => {
      let valueA = "";
      let valueB = "";

      if (sortBy === "createdAt") {
        valueA = a.createdAt ? new Date(a.createdAt).toISOString() : "";
        valueB = b.createdAt ? new Date(b.createdAt).toISOString() : "";
      }

      if (sortBy === "fullName") {
        valueA = a.fullName || "";
        valueB = b.fullName || "";
      }

      if (sortBy === "email") {
        valueA = a.email || "";
        valueB = b.email || "";
      }

      if (sortBy === "role") {
        valueA = a.role || "";
        valueB = b.role || "";
      }

      const compare = valueA.localeCompare(valueB);

      return sortOrder === "asc" ? compare : -compare;
    });

    return result;
  }, [
    users,
    search,
    filterRole,
    filterActive,
    filterEmailVerified,
    sortBy,
    sortOrder,
  ]);

  const total = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const paginatedUsers = useMemo(() => {
    const startIndex = (page - 1) * limit;
    return filteredUsers.slice(startIndex, startIndex + limit);
  }, [filteredUsers, page, limit]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const resetForm = () => {
    setFormMode("create");
    setSelectedUserId(null);

    setFullName("");
    setEmail("");
    setPassword("");
    setPhoneNumber("");
    setDateOfBirth("");
    setGender("");
    setAvatarUrl("");
    setRole("LEARNER");
    setIsActive(true);
    setEmailVerified(false);

    setError(null);
  };

  const closeFormModal = () => {
    if (loading) return;

    setFormModalOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setFormMode("create");
    setFormModalOpen(true);
  };

  const openEditModal = (item: UserItem) => {
    setFormMode("edit");
    setSelectedUserId(item.id);

    setFullName(item.fullName || "");
    setEmail(item.email || "");
    setPassword("");
    setPhoneNumber(item.phoneNumber || "");
    setDateOfBirth(formatDateInput(item.dateOfBirth));
    setGender(item.gender || "");
    setAvatarUrl(item.avatarUrl || "");
    setRole(item.role || "LEARNER");
    setIsActive(Boolean(item.isActive));
    setEmailVerified(Boolean(item.emailVerified));

    setError(null);
    setFormModalOpen(true);
  };

  const closeConfirmModal = () => {
    setConfirmModal({
      open: false,
      title: "",
      message: "",
      confirmText: "Confirm",
      variant: "danger",
      onConfirm: null,
    });
  };

  const handleDelete = (item: UserItem) => {
    setConfirmModal({
      open: true,
      title: "Delete user?",
      message: `Are you sure you want to delete "${
        item.fullName || item.email || "this user"
      }"? This action may remove the user from the system.`,
      confirmText: "Delete",
      variant: "danger",
      onConfirm: async () => {
        setLoading(true);
        setError(null);

        try {
          await api.delete(`/v1/admin/users/${item.id}`);

          if (selectedUserId === item.id) {
            resetForm();
          }

          if (detailModal.user?.id === item.id) {
            closeDetailModal();
          }

          await loadUsers();
          closeConfirmModal();

          openResultModal(
            "User deleted",
            "The user has been deleted successfully."
          );
        } catch (err: any) {
          setError(err?.response?.data?.message || "Delete failed");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const buildCreatePayload = () => {
    const payload: {
      fullName: string;
      email: string;
      password: string;
      phoneNumber?: string;
      dateOfBirth?: string;
      gender?: Gender;
      avatarUrl?: string;
      role: Role;
    } = {
      fullName: fullName.trim(),
      email: email.trim(),
      password: password.trim(),
      role,
    };

    if (phoneNumber.trim()) {
      payload.phoneNumber = phoneNumber.trim();
    }

    if (dateOfBirth) {
      payload.dateOfBirth = dateOfBirth;
    }

    if (gender) {
      payload.gender = gender;
    }

    if (avatarUrl.trim()) {
      payload.avatarUrl = avatarUrl.trim();
    }

    return payload;
  };

  const buildUpdatePayload = () => {
    const payload: {
      fullName?: string;
      email?: string;
      password?: string;
      phoneNumber?: string;
      dateOfBirth?: string;
      gender?: Gender;
      avatarUrl?: string;
      role?: Role;
      isActive?: boolean;
      emailVerified?: boolean;
    } = {
      fullName: fullName.trim(),
      email: email.trim(),
      role,
      isActive,
      emailVerified,
    };

    if (password.trim()) {
      payload.password = password.trim();
    }

    if (phoneNumber.trim()) {
      payload.phoneNumber = phoneNumber.trim();
    }

    if (dateOfBirth) {
      payload.dateOfBirth = dateOfBirth;
    }

    if (gender) {
      payload.gender = gender;
    }

    if (avatarUrl.trim()) {
      payload.avatarUrl = avatarUrl.trim();
    }

    return payload;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);
    setError(null);

    if (!fullName.trim()) {
      setError("Full name is required");
      setLoading(false);
      return;
    }

    if (fullName.trim().length < 2) {
      setError("Full name must be at least 2 characters");
      setLoading(false);
      return;
    }

    if (!email.trim()) {
      setError("Email is required");
      setLoading(false);
      return;
    }

    if (formMode === "create" && !password.trim()) {
      setError("Password is required when creating a user");
      setLoading(false);
      return;
    }

    if (password.trim()) {
      const strongPasswordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

      if (!strongPasswordRegex.test(password.trim())) {
        setError(
          "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&)"
        );
        setLoading(false);
        return;
      }
    }

    try {
      if (formMode === "create") {
        await api.post("/v1/admin/users", buildCreatePayload());

        setFormModalOpen(false);
        resetForm();
        await loadUsers();

        openResultModal(
          "User created",
          "The new user has been created successfully."
        );
      }

      if (formMode === "edit" && selectedUserId) {
        await api.patch(`/v1/admin/users/${selectedUserId}`, buildUpdatePayload());

        setFormModalOpen(false);
        resetForm();
        await loadUsers();

        openResultModal(
          "User updated",
          "The user information has been updated successfully."
        );
      }
    } catch (err: any) {
      const message = err?.response?.data?.message;

      if (Array.isArray(message)) {
        setError(message.join(", "));
      } else {
        setError(message || "Save failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const getModalIconStyle = () => {
    if (confirmModal.variant === "danger") {
      return "bg-red-100 text-red-600";
    }

    if (confirmModal.variant === "warning") {
      return "bg-yellow-100 text-yellow-700";
    }

    return "bg-green-100 text-green-700";
  };

  const getModalButtonStyle = () => {
    if (confirmModal.variant === "danger") {
      return "bg-red-600 hover:bg-red-700";
    }

    if (confirmModal.variant === "warning") {
      return "bg-yellow-600 hover:bg-yellow-700";
    }

    return "bg-green-600 hover:bg-green-700";
  };

  const getModalIcon = () => {
    if (confirmModal.variant === "danger") return "!";
    if (confirmModal.variant === "warning") return "!";
    return "✓";
  };

  if (authLoading) {
    return <div className="p-6 text-center text-zinc-500">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="p-6 text-center text-red-500">
        Please log in as an admin to view this page.
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 text-center text-red-500">
        Access denied. Admins only.
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-zinc-50 p-6">
        <div className="mx-auto max-w-[1400px] space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-zinc-900">
                  Admin — Users
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Search, filter, create, edit and manage users from the admin
                  panel.
                </p>
              </div>

              <button
                type="button"
                onClick={openCreateModal}
                disabled={loading}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                + New User
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 p-6">
              <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-zinc-900">
                    User Datatable
                  </h3>
                  <p className="text-sm text-zinc-500">
                    Showing important user information returned from the admin
                    user API.
                  </p>
                </div>

                <div className="text-sm text-zinc-500">
                  Total:{" "}
                  <span className="font-medium text-zinc-800">{total}</span>{" "}
                  users
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-5">
                <input
                  type="text"
                  placeholder="Search by name, email, phone, role..."
                  className="rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />

                <select
                  className="rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={filterRole}
                  onChange={(e) => {
                    setFilterRole(e.target.value as Role | "all");
                    setPage(1);
                  }}
                >
                  <option value="all">All Roles</option>
                  {roleOptions.map((item) => (
                    <option key={item} value={item}>
                      {formatEnumLabel(item)}
                    </option>
                  ))}
                </select>

                <select
                  className="rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={filterActive === "all" ? "all" : String(filterActive)}
                  onChange={(e) => {
                    setFilterActive(
                      e.target.value === "all"
                        ? "all"
                        : e.target.value === "true"
                    );
                    setPage(1);
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>

                <select
                  className="rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={
                    filterEmailVerified === "all"
                      ? "all"
                      : String(filterEmailVerified)
                  }
                  onChange={(e) => {
                    setFilterEmailVerified(
                      e.target.value === "all"
                        ? "all"
                        : e.target.value === "true"
                    );
                    setPage(1);
                  }}
                >
                  <option value="all">All Verified</option>
                  <option value="true">Verified</option>
                  <option value="false">Not verified</option>
                </select>

                <select
                  className="rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split("-");

                    setSortBy(
                      field as "createdAt" | "fullName" | "email" | "role"
                    );
                    setSortOrder(order as "asc" | "desc");
                    setPage(1);
                  }}
                >
                  <option value="createdAt-desc">Newest First</option>
                  <option value="createdAt-asc">Oldest First</option>
                  <option value="fullName-asc">Name A-Z</option>
                  <option value="fullName-desc">Name Z-A</option>
                  <option value="email-asc">Email A-Z</option>
                  <option value="email-desc">Email Z-A</option>
                  <option value="role-asc">Role A-Z</option>
                  <option value="role-desc">Role Z-A</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                    <th className="px-4 py-3 text-left font-semibold">Avatar</th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Full Name
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">Email</th>
                    <th className="px-4 py-3 text-left font-semibold">Phone</th>
                    <th className="px-4 py-3 text-center font-semibold">
                      Gender
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Date of Birth
                    </th>
                    <th className="px-4 py-3 text-center font-semibold">Role</th>
                    <th className="px-4 py-3 text-center font-semibold">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center font-semibold">
                      Email Verified
                    </th>
                    <th className="px-4 py-3 text-center font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {tableLoading ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-8 text-center text-zinc-500"
                      >
                        Loading users...
                      </td>
                    </tr>
                  ) : paginatedUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-8 text-center text-zinc-500"
                      >
                        No users found
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((item) => (
                      <tr
                        key={item.id}
                        className={`border-b border-zinc-100 transition hover:bg-zinc-50 ${
                          selectedUserId === item.id ? "bg-blue-50/60" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          {item.avatarUrl ? (
                            <img
                              src={item.avatarUrl}
                              alt={item.fullName || "User avatar"}
                              className="h-10 w-10 rounded-full border object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-500">
                              N/A
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 font-medium text-zinc-900">
                          {item.fullName || "-"}
                        </td>

                        <td className="px-4 py-3 text-zinc-600">
                          {item.email || "-"}
                        </td>

                        <td className="px-4 py-3 text-zinc-600">
                          {item.phoneNumber || "-"}
                        </td>

                        <td className="px-4 py-3 text-center">
                          {item.gender ? (
                            <span className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                              {formatEnumLabel(item.gender)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td className="px-4 py-3 text-zinc-600">
                          {formatDateInput(item.dateOfBirth) || "-"}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                            {formatEnumLabel(item.role)}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                              item.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {item.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                              item.emailVerified
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {item.emailVerified ? "Verified" : "Not verified"}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openDetailModal(item)}
                              disabled={loading}
                              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Info
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              disabled={loading}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              disabled={loading}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-4 border-t border-zinc-200 p-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-zinc-600">
                Showing {total === 0 ? 0 : (page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, total)} of {total} users
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1 || loading || tableLoading}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-zinc-400"
                >
                  Previous
                </button>

                <span className="px-2 py-1.5 text-sm text-zinc-600">
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages || loading || tableLoading}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-zinc-400"
                >
                  Next
                </button>

                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm outline-none"
                  disabled={loading || tableLoading}
                >
                  <option value={5}>5/page</option>
                  <option value={10}>10/page</option>
                  <option value={20}>20/page</option>
                  <option value={50}>50/page</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <form onSubmit={handleSubmit}>
              <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-zinc-900">
                      {formMode === "create" ? "Create User" : "Edit User"}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      {formMode === "create"
                        ? "Fill in the information below to create a new user."
                        : "Update the selected user's information below."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeFormModal}
                    disabled={loading}
                    className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-zinc-700">
                      Full Name *
                    </span>
                    <input
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-zinc-100"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-zinc-700">Email *</span>
                    <input
                      type="email"
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-zinc-100"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-zinc-700">
                      Password{" "}
                      {formMode === "edit" ? "(leave blank to keep current)" : "*"}
                    </span>
                    <input
                      type="password"
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-zinc-100"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required={formMode === "create"}
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-zinc-700">Phone Number</span>
                    <input
                      type="text"
                      placeholder="+84123456789"
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-zinc-100"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={loading}
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-zinc-700">
                      Date of Birth
                    </span>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-zinc-100"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      disabled={loading}
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-zinc-700">Gender</span>
                    <select
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-zinc-100"
                      value={gender}
                      onChange={(e) => setGender(e.target.value as Gender | "")}
                      disabled={loading}
                    >
                      <option value="">Not set</option>
                      {genderOptions.map((item) => (
                        <option key={item} value={item}>
                          {formatEnumLabel(item)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-zinc-700">Role *</span>
                    <select
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-zinc-100"
                      value={role}
                      onChange={(e) => setRole(e.target.value as Role)}
                      disabled={loading}
                      required
                    >
                      {roleOptions.map((item) => (
                        <option key={item} value={item}>
                          {formatEnumLabel(item)}
                        </option>
                      ))}
                    </select>
                  </label>

                  {formMode === "edit" && (
                    <>
                      <label className="space-y-2 text-sm">
                        <span className="font-medium text-zinc-700">Status</span>
                        <select
                          className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-zinc-100"
                          value={String(isActive)}
                          onChange={(e) => setIsActive(e.target.value === "true")}
                          disabled={loading}
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </label>

                      <label className="space-y-2 text-sm">
                        <span className="font-medium text-zinc-700">
                          Email Verified
                        </span>
                        <select
                          className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-zinc-100"
                          value={String(emailVerified)}
                          onChange={(e) =>
                            setEmailVerified(e.target.value === "true")
                          }
                          disabled={loading}
                        >
                          <option value="true">Verified</option>
                          <option value="false">Not verified</option>
                        </select>
                      </label>
                    </>
                  )}

                  <label className="space-y-2 text-sm md:col-span-2">
                    <span className="font-medium text-zinc-700">Avatar URL</span>
                    <input
                      type="url"
                      placeholder="https://example.com/avatar.jpg"
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-zinc-100"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      disabled={loading}
                    />
                  </label>
                </div>

                {avatarUrl && (
                  <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <img
                      src={avatarUrl}
                      alt="Avatar preview"
                      className="h-14 w-14 rounded-full border object-cover"
                    />

                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-800">
                        Avatar Preview
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {avatarUrl}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 flex flex-col gap-3 border-t border-zinc-200 bg-white p-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeFormModal}
                  disabled={loading}
                  className="rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {loading
                    ? "Saving..."
                    : formMode === "create"
                    ? "Create User"
                    : "Update User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailModal.open && detailModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-zinc-200 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-zinc-900">
                    User Details
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    View full user information returned from the API.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeDetailModal}
                  className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-100"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                {detailModal.user.avatarUrl ? (
                  <img
                    src={detailModal.user.avatarUrl}
                    alt={detailModal.user.fullName || "User avatar"}
                    className="h-16 w-16 rounded-full border object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-500">
                    N/A
                  </div>
                )}

                <div className="min-w-0">
                  <p className="font-semibold text-zinc-900">
                    {detailModal.user.fullName || "-"}
                  </p>
                  <p className="truncate text-sm text-zinc-500">
                    {detailModal.user.email || "-"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                      {formatEnumLabel(detailModal.user.role)}
                    </span>

                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        detailModal.user.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {detailModal.user.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 p-4">
                  <p className="text-xs font-medium uppercase text-zinc-500">ID</p>
                  <p className="mt-1 break-all font-mono text-sm text-zinc-800">
                    {detailModal.user.id || "-"}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200 p-4">
                  <p className="text-xs font-medium uppercase text-zinc-500">
                    Full Name
                  </p>
                  <p className="mt-1 text-sm text-zinc-800">
                    {detailModal.user.fullName || "-"}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200 p-4">
                  <p className="text-xs font-medium uppercase text-zinc-500">
                    Email
                  </p>
                  <p className="mt-1 break-all text-sm text-zinc-800">
                    {detailModal.user.email || "-"}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200 p-4">
                  <p className="text-xs font-medium uppercase text-zinc-500">
                    Phone Number
                  </p>
                  <p className="mt-1 text-sm text-zinc-800">
                    {detailModal.user.phoneNumber || "-"}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200 p-4">
                  <p className="text-xs font-medium uppercase text-zinc-500">
                    Gender
                  </p>
                  <p className="mt-1 text-sm text-zinc-800">
                    {formatEnumLabel(detailModal.user.gender)}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200 p-4">
                  <p className="text-xs font-medium uppercase text-zinc-500">
                    Date of Birth
                  </p>
                  <p className="mt-1 text-sm text-zinc-800">
                    {formatDateInput(detailModal.user.dateOfBirth) || "-"}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200 p-4">
                  <p className="text-xs font-medium uppercase text-zinc-500">
                    Role
                  </p>
                  <p className="mt-1 text-sm text-zinc-800">
                    {formatEnumLabel(detailModal.user.role)}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200 p-4">
                  <p className="text-xs font-medium uppercase text-zinc-500">
                    Email Verified
                  </p>
                  <span
                    className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                      detailModal.user.emailVerified
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {detailModal.user.emailVerified ? "Verified" : "Not verified"}
                  </span>
                </div>

                <div className="rounded-xl border border-zinc-200 p-4">
                  <p className="text-xs font-medium uppercase text-zinc-500">
                    Created At
                  </p>
                  <p className="mt-1 text-sm text-zinc-800">
                    {formatDateTime(detailModal.user.createdAt)}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200 p-4">
                  <p className="text-xs font-medium uppercase text-zinc-500">
                    Updated At
                  </p>
                  <p className="mt-1 text-sm text-zinc-800">
                    {formatDateTime(detailModal.user.updatedAt)}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200 p-4 md:col-span-2">
                  <p className="text-xs font-medium uppercase text-zinc-500">
                    Last Login
                  </p>
                  <p className="mt-1 text-sm text-zinc-800">
                    {formatDateTime(detailModal.user.lastLoginAt)}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200 p-4 md:col-span-2">
                  <p className="text-xs font-medium uppercase text-zinc-500">
                    Avatar URL
                  </p>
                  <p className="mt-1 break-all text-sm text-zinc-800">
                    {detailModal.user.avatarUrl || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-zinc-200 p-6">
              <button
                type="button"
                onClick={closeDetailModal}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5">
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold ${getModalIconStyle()}`}
              >
                {getModalIcon()}
              </div>

              <h3 className="text-lg font-semibold text-zinc-900">
                {confirmModal.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {confirmModal.message}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeConfirmModal}
                disabled={loading}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => confirmModal.onConfirm?.()}
                disabled={loading}
                className={`rounded-lg px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60 ${getModalButtonStyle()}`}
              >
                {loading ? "Processing..." : confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {resultModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-xl font-bold text-green-700">
                ✓
              </div>

              <h3 className="text-lg font-semibold text-zinc-900">
                {resultModal.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {resultModal.message}
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={closeResultModal}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}