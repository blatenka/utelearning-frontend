"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  XCircle,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

import {
  paymentService,
  unwrapData,
} from "@/services/payment.service";

import type { VnpayReturnResponse } from "@/services/payment.service";

export default function VnpayReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [result, setResult] = useState<VnpayReturnResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    return searchParams.toString();
  }, [searchParams]);

  const isSuccess =
    result?.status === "success" || result?.status === "already_paid";

  async function verifyReturn() {
    if (!queryString) {
      setError("Missing VNPAY return parameters.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await paymentService.handleVnpayReturn(queryString);
      const payload = unwrapData<VnpayReturnResponse>(response);

      setResult(payload);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to verify VNPAY return."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    verifyReturn();
  }, [queryString]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-10">
      <div className="w-full max-w-xl rounded-3xl border bg-white p-8 text-center shadow-sm">
        {loading ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>

            <h1 className="mt-5 text-2xl font-bold text-zinc-950">
              Verifying payment
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Please wait while we verify your VNPAY transaction.
            </p>
          </>
        ) : error ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>

            <h1 className="mt-5 text-2xl font-bold text-zinc-950">
              Payment verification failed
            </h1>

            <p className="mt-2 text-sm text-red-600">
              {Array.isArray(error) ? error.join(", ") : error}
            </p>

            <button
              type="button"
              onClick={() => router.push("/my-learning")}
              className="mt-6 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700"
            >
              Go to My Learning
            </button>
          </>
        ) : isSuccess ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>

            <h1 className="mt-5 text-2xl font-bold text-zinc-950">
              Payment successful
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Your payment has been verified successfully.
            </p>

            {result?.payment && (
              <div className="mt-6 rounded-2xl border bg-zinc-50 p-4 text-left text-sm">
                <p>
                  <span className="font-medium text-zinc-900">Payment ID:</span>{" "}
                  {result.payment.id}
                </p>
                <p className="mt-1">
                  <span className="font-medium text-zinc-900">Status:</span>{" "}
                  {result.payment.status}
                </p>
                <p className="mt-1">
                  <span className="font-medium text-zinc-900">Amount:</span>{" "}
                  {result.payment.amount?.toLocaleString("vi-VN")}{" "}
                  {result.payment.currency || "VND"}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (result?.payment?.courseId) {
                  router.push(`/learning/courses/${result.payment.courseId}`);
                } else {
                  router.push("/my-learning");
                }
              }}
              className="mt-6 inline-flex items-center rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700"
            >
              Start Learning
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>

            <h1 className="mt-5 text-2xl font-bold text-zinc-950">
              Payment failed
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Your payment was not completed. You can try again from the course
              checkout page.
            </p>

            {result?.payment && (
              <div className="mt-6 rounded-2xl border bg-zinc-50 p-4 text-left text-sm">
                <p>
                  <span className="font-medium text-zinc-900">Payment ID:</span>{" "}
                  {result.payment.id}
                </p>
                <p className="mt-1">
                  <span className="font-medium text-zinc-900">Status:</span>{" "}
                  {result.payment.status}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => router.push("/my-learning")}
              className="mt-6 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700"
            >
              Go to My Learning
            </button>
          </>
        )}
      </div>
    </main>
  );
}