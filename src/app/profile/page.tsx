"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

const GENDERS = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"];

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshMe } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const avatarPreviewUrl = useMemo(() => {
    if (!avatarFile) return null;
    return URL.createObjectURL(avatarFile);
  }, [avatarFile]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/auth?tab=login");
      return;
    }

    async function loadProfile() {
      try {
        setProfileLoading(true);
        setError(null);

        const res = await api.get("/v1/users/me");
        const data = res.data.data;

        setProfile(data);
        setFullName(data.fullName || "");
        setGender(data.gender || "");
        setDateOfBirth(formatDateForInput(data.dateOfBirth));
      } catch (err) {
        setError("Unable to load profile");
      } finally {
        setProfileLoading(false);
      }
    }

    loadProfile();
  }, [router, user, authLoading]);

  function formatDateForInput(date?: string) {
    if (!date) return "";

    try {
      return new Date(date).toISOString().split("T")[0];
    } catch {
      return "";
    }
  }

  function getErrorMessage(err: any, fallback: string) {
    const message = err?.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(", ");
    }

    if (typeof message === "string") {
      return message;
    }

    return err?.message || fallback;
  }

  function handleCancelEdit() {
    setEditMode(false);
    setError(null);
    setSuccess(null);

    setFullName(profile?.fullName || "");
    setGender(profile?.gender || "");
    setDateOfBirth(formatDateForInput(profile?.dateOfBirth));
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    setError(null);
    setSuccess(null);

    if (!file) {
      setAvatarFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setError("Image size must be less than 5MB.");
      return;
    }

    setAvatarFile(file);
  }

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault();

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updateData: any = {
        fullName: fullName.trim(),
      };

      if (gender) {
        updateData.gender = gender;
      }

      if (dateOfBirth) {
        updateData.dateOfBirth = new Date(dateOfBirth).toISOString();
      }

      await api.patch("/v1/users/me", updateData);
      await refreshMe();

      setProfile((prev: any) => ({
        ...prev,
        fullName: fullName.trim(),
        gender,
        dateOfBirth,
      }));

      setSuccess("Profile updated successfully!");
      setEditMode(false);
    } catch (err: any) {
      setError(getErrorMessage(err, "Update failed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarUpload() {
  if (!avatarFile || !user) {
    setError("Please select an image first.");
    return;
  }

  setLoading(true);
  setError(null);
  setSuccess(null);

  try {
    const publicId = `user_${user.id}`;

    const sigRes = await api.post("/v1/upload/signature", {
      entityType: "user",
      entityId: user.id,
      resourceType: "image",
      subFolder: "avatars",
      publicId,
    });

    const {
      signature,
      timestamp,
      cloudName,
      apiKey,
      uploadPreset,
      folder,
      resourceType,
    } = sigRes.data.data;

    if (!signature || !timestamp || !cloudName || !apiKey || !folder) {
      throw new Error("Invalid upload signature response");
    }

    const fd = new FormData();
    fd.append("file", avatarFile);
    fd.append("api_key", apiKey);
    fd.append("timestamp", String(timestamp));
    fd.append("signature", signature);
    fd.append("folder", folder);
    fd.append("public_id", publicId);

    if (uploadPreset) {
      fd.append("upload_preset", uploadPreset);
    }

    const cloudUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType || "image"}/upload`;

    const uploadRes = await fetch(cloudUrl, {
      method: "POST",
      body: fd,
    });

    const uploadJson = await uploadRes.json();

    if (!uploadRes.ok) {
      throw new Error(
        uploadJson?.error?.message || "Cloudinary upload failed",
      );
    }

    const avatarUrl = uploadJson.secure_url;

    if (!avatarUrl) {
      throw new Error("Cloudinary did not return avatar URL");
    }

    await api.patch("/v1/users/me", { avatarUrl });

    await refreshMe();

    setProfile((prev: any) => ({
      ...prev,
      avatarUrl,
    }));

    setAvatarFile(null);
    setSuccess("Avatar updated successfully!");
  } catch (err: any) {
    console.error(err);
    setError(getErrorMessage(err, "Upload failed"));
  } finally {
    setLoading(false);
  }
}

  if (authLoading || profileLoading) {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
            <div className="animate-pulse space-y-6">
              <div className="h-8 w-48 rounded bg-zinc-200" />
              <div className="h-28 rounded-2xl bg-zinc-100" />
              <div className="h-64 rounded-2xl bg-zinc-100" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950">
            My Profile
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Manage your personal information and account avatar.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-center">
              <div className="mx-auto h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-zinc-100 shadow-lg ring-1 ring-zinc-200">
                {avatarPreviewUrl ? (
                  <img
                    src={avatarPreviewUrl}
                    alt="Avatar preview"
                    className="h-full w-full object-cover"
                  />
                ) : profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-sm font-medium text-zinc-400">
                    No Avatar
                  </div>
                )}
              </div>

              <h2 className="mt-5 text-xl font-semibold text-zinc-950">
                {profile?.fullName || "Unnamed User"}
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                {profile?.email || "No email"}
              </p>

              <div className="mt-3 inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                {profile?.role || "USER"}
              </div>
            </div>

            <div className="mt-8 border-t border-zinc-200 pt-6">
              <h3 className="text-sm font-semibold text-zinc-950">
                Profile photo
              </h3>

              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Upload a clear image. JPG, PNG, or WEBP. Maximum size 5MB.
              </p>

              {avatarFile && (
                <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-xs font-medium text-zinc-500">
                    Selected image
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-zinc-800">
                    {avatarFile.name}
                  </p>
                </div>
              )}

              <div className="mt-5 grid gap-3">
                <label
                  htmlFor="avatar-file"
                  className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  Choose Image
                </label>

                <input
                  id="avatar-file"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={loading}
                  className="hidden"
                />

                {avatarFile && (
                  <button
                    type="button"
                    onClick={() => setAvatarFile(null)}
                    disabled={loading}
                    className="h-11 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Remove Selected Image
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleAvatarUpload}
                  disabled={!avatarFile || loading}
                  className="h-11 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Uploading..." : "Upload Avatar"}
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-zinc-950">
                  Profile Information
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Update your personal details here.
                </p>
              </div>

              {!editMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccess(null);
                    setEditMode(true);
                  }}
                  className="h-10 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  Edit Profile
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={loading}
                  className="h-10 rounded-xl border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Cancel
                </button>
              )}
            </div>

            {!editMode ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoItem label="Full Name" value={profile?.fullName || "N/A"} />
                <InfoItem label="Email" value={profile?.email || "N/A"} />
                <InfoItem
                  label="Gender"
                  value={profile?.gender || "Not specified"}
                />
                <InfoItem
                  label="Date of Birth"
                  value={
                    profile?.dateOfBirth
                      ? new Date(profile.dateOfBirth).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )
                      : "Not specified"
                  }
                />
                <InfoItem label="Role" value={profile?.role || "N/A"} />
                <InfoItem label="User ID" value={profile?.id || user.id} />
              </div>
            ) : (
              <form onSubmit={handleProfileUpdate} className="space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="fullName"
                    className="text-sm font-medium text-zinc-700"
                  >
                    Full Name
                  </label>

                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                    required
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10 disabled:cursor-not-allowed disabled:bg-zinc-100"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="gender"
                    className="text-sm font-medium text-zinc-700"
                  >
                    Gender
                  </label>

                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    disabled={loading}
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10 disabled:cursor-not-allowed disabled:bg-zinc-100"
                  >
                    <option value="">Select Gender</option>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="dateOfBirth"
                    className="text-sm font-medium text-zinc-700"
                  >
                    Date of Birth
                  </label>

                  <input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    disabled={loading}
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10 disabled:cursor-not-allowed disabled:bg-zinc-100"
                  />
                </div>

                <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-11 rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={loading}
                    className="h-11 rounded-xl border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-zinc-950">
        {value}
      </p>
    </div>
  );
}