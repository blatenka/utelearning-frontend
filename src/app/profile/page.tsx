"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshMe } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/auth?tab=login");
      return;
    }

    api
      .get("/users/me")
      .then((res) => {
        setProfile(res.data.data);
        setFullName(res.data.data.fullName || "");
        setEmail(res.data.data.email || "");
      })
      .catch(() => setError("Unable to load profile"));
  }, [router, user, authLoading]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.patch("/users/me", { fullName, email });
      await refreshMe();
      setProfile((prev: any) => ({ ...prev, fullName, email }));
    } catch (err: any) {
      setError(err?.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarUpload() {
    if (!avatarFile || !user) {
      setError("Select an image");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const sigRes = await api.post("/upload/signature", {
        folder: `users/${user.id}/avatars`,
        resourceType: "image",
        publicId: `user_${user.id}`,
      });

      const { signature, timestamp, cloudName, apiKey, uploadPreset } = sigRes.data.data;
      const fd = new FormData();
      fd.append("file", avatarFile);
      fd.append("api_key", apiKey);
      fd.append("timestamp", String(timestamp));
      fd.append("signature", signature);
      fd.append("upload_preset", uploadPreset);
      fd.append("folder", `users/${user.id}/avatars`);
      fd.append("public_id", `user_${user.id}`);

      const cloudUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      const uploadRes = await fetch(cloudUrl, { method: "POST", body: fd });
      const uploadJson = await uploadRes.json();
      const avatarUrl = uploadJson.secure_url;

      await api.patch("/users/me", { avatarUrl });
      await refreshMe();
      setProfile((prev: any) => ({ ...prev, avatarUrl }));
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center p-6 text-zinc-500">
        Loading profile...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="bg-white p-6 rounded shadow max-w-lg mx-auto">
      <h2 className="text-xl font-semibold mb-4">Profile</h2>
      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
      <form onSubmit={handleUpdate} className="flex flex-col gap-3">
        <label className="space-y-1 text-sm">
          <span>Full Name</span>
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
            className="w-full border p-2 rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </label>
        <button className="w-fit rounded bg-primary px-4 py-2 text-white" disabled={loading}>
          Save Profile
        </button>
      </form>

      <div className="mt-8">
        <h3 className="font-semibold">Avatar</h3>
        {profile?.avatarUrl ? (
          <img src={profile.avatarUrl} alt="Avatar" className="mt-3 h-24 w-24 rounded-full object-cover" />
        ) : (
          <div className="mt-3 text-sm text-zinc-600">No avatar set</div>
        )}
        <label className="mt-4 flex flex-col gap-2 text-sm">
          <span>Choose image</span>
          <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
        </label>
        <button
          type="button"
          className="mt-3 rounded bg-primary px-4 py-2 text-white"
          onClick={handleAvatarUpload}
          disabled={loading}
        >
          Upload Avatar
        </button>
      </div>
    </div>
  );
}
