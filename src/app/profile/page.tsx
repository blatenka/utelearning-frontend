"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

const GENDERS = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"];

export default function ProfilePage() 
{
  const router = useRouter();
  const { user, loading: authLoading, refreshMe } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  
  // Edit form state
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
        setGender(res.data.data.gender || "");
        setDateOfBirth(res.data.data.dateOfBirth || "");
      })
      .catch(() => setError("Unable to load profile"));
  }, [router, user, authLoading]);

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const updateData: any = { fullName };
      
      if (gender) updateData.gender = gender;
      if (dateOfBirth) {
        // Convert YYYY-MM-DD to ISO-8601 format with time (YYYY-MM-DDTHH:mm:ss.sssZ)
        const dateObj = new Date(dateOfBirth);
        updateData.dateOfBirth = dateObj.toISOString();
      }
      
      await api.patch("/users/me", updateData);
      await refreshMe();
      setProfile((prev: any) => ({ 
        ...prev, 
        fullName, 
        gender, 
        dateOfBirth 
      }));
      setSuccess("Profile updated successfully!");
      setEditMode(false);
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
    setSuccess(null);
    
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
      setAvatarFile(null);
      setSuccess("Avatar updated successfully!");
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
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-8">My Profile</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
          {success}
        </div>
      )}

      {/* Avatar Section */}
      <div className="mb-8 pb-8 border-b border-zinc-200">
        <h2 className="text-xl font-semibold mb-4">Avatar</h2>
        <div className="flex items-center gap-6">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="Avatar"
              className="w-24 h-24 rounded-full object-cover border-2 border-zinc-300"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-zinc-300 flex items-center justify-center text-zinc-600">
              No Avatar
            </div>
          )}
          <div className="flex flex-col gap-3">
            <label className="inline-block">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                disabled={loading}
                className="hidden"
                id="avatar-file"
              />
              <span className="px-3 py-1.5 bg-zinc-100 text-zinc-700 text-xs font-medium rounded-md hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50 inline-block border border-zinc-200">
                  Browse Files
              </span>
            </label>
            <button
              type="button"
              onClick={handleAvatarUpload}
              disabled={!avatarFile || loading}
              className="px-3 py-1.5 bg-black text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Uploading..." : "Upload Avatar"}
            </button>
          </div>
        </div>
      </div>

      {/* Profile Information Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Profile Information</h2>
          <button
            type="button"
            onClick={() => setEditMode(!editMode)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            {editMode ? "Cancel" : "Edit"}
          </button>
        </div>

        {!editMode ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-600">Full Name</label>
              <p className="text-lg text-zinc-900">{profile?.fullName || "N/A"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-600">Email</label>
              <p className="text-lg text-zinc-900">{profile?.email || "N/A"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-600">Gender</label>
              <p className="text-lg text-zinc-900">{profile?.gender || "Not specified"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-600">Date of Birth</label>
              <p className="text-lg text-zinc-900">
                {profile?.dateOfBirth
                  ? new Date(profile.dateOfBirth).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Not specified"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-600">Role</label>
              <p className="text-lg text-zinc-900">{profile?.role || "N/A"}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                required
                className="w-full border border-zinc-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                disabled={loading}
                className="w-full border border-zinc-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Gender</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Date of Birth (YYYY-MM-DD)
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                disabled={loading}
                className="w-full border border-zinc-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
