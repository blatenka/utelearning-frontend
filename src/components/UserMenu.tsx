"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

export default function UserMenu({ user }: { user: any }) {
  const router = useRouter();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isAdmin = user?.role === "ADMIN";

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

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-full border border-zinc-200 bg-white p-1 shadow-sm hover:bg-zinc-50 transition-all cursor-pointer flex items-center"
        title={user.fullName}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.fullName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-zinc-300 flex items-center justify-center text-xs font-semibold text-zinc-700">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      <div
        className={`absolute right-0 z-20 mt-2 w-48 rounded-xl border border-zinc-200/80 bg-white/95 backdrop-blur-md p-1.5 shadow-xl transition-all duration-200 origin-top-right ${
          open
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
        }`}
      >
        <button
          type="button"
          className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
          onClick={() => {
            setOpen(false);
            router.push("/profile");
          }}
        >
          Profile
        </button>

        {isAdmin && (
          <>
            <div className="border-t border-zinc-200 my-1" />
            <button
              type="button"
              className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer text-blue-600"
              onClick={() => {
                setOpen(false);
                router.push("/admin/users");
              }}
            >
              User Management
            </button>
            <button
              type="button"
              className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer text-blue-600"
              onClick={() => {
                setOpen(false);
                router.push("/admin/categories");
              }}
            >
              Categories Management
            </button>
          </>
        )}

        <div className="border-t border-zinc-200 my-1" />
        <button
          type="button"
          className="block w-full text-left px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
          onClick={() => {
            setOpen(false);
            logout();
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
