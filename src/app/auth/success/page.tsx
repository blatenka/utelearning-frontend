"use client";
import React, { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { Loader2 } from "lucide-react";

function SuccessHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshMe } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      localStorage.setItem("accessToken", token);
      refreshMe()
        .then(() => {
          router.replace("/dashboard");
        })
        .catch((err) => {
          console.error("Google auth callback refreshMe failed", err);
          router.replace("/auth?tab=login");
        });
    } else {
      router.replace("/auth?tab=login");
    }
  }, [searchParams, refreshMe, router]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-black rounded-2xl border border-zinc-200/50 shadow-xl max-w-md mx-auto my-12">
      <div className="relative flex items-center justify-center mb-6">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
        <Loader2 className="h-10 w-10 text-primary animate-spin relative" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Authenticating</h3>
      <p className="text-sm text-zinc-500 max-w-xs">
        Setting up your secure session and retrieving your profile details...
      </p>
    </div>
  );
}

export default function AuthSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center p-8 text-zinc-400">
          Loading auth success...
        </div>
      }
    >
      <SuccessHandler />
    </Suspense>
  );
}
