"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
  Smartphone,
  TestTube2,
  XCircle,
} from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";
import {
  paymentService,
  unwrapData,
} from "@/services/payment.service";

import type {
  PaymentResponse,
  SimulationPaymentResponse,
  VnpayCreatePaymentUrlResponse,
} from "@/services/payment.service";

import {
  enrollmentService,
  unwrapData as unwrapEnrollmentData,
} from "@/services/enrollment.service";

import type { EnrollmentStatusResponse } from "@/services/enrollment.service";

function formatPrice(amount?: number | null) {
  if (!amount) return "Free";

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getPaymentUrl(payload: VnpayCreatePaymentUrlResponse) {
  return payload.paymentUrl || payload.url || payload.redirectUrl || "";
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const courseId = String(params.courseId);
  const slug = searchParams.get("slug");

  const [selectedMethod, setSelectedMethod] = useState<"simulation" | "vnpay">(
    "simulation"
  );
  const [locale, setLocale] = useState<"vn" | "en">("vn");
  const [bankCode, setBankCode] = useState("");

  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [paymentStatusText, setPaymentStatusText] = useState("");

  const [checkingEnrollment, setCheckingEnrollment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isLearner = user?.role === "LEARNER";

  const backUrl = useMemo(() => {
    if (slug) return `/courses/${slug}`;
    return "/";
  }, [slug]);

  async function checkAlreadyEnrolled() {
    if (!user || !isLearner) return;

    try {
      setCheckingEnrollment(true);

      const response = await enrollmentService.getEnrollmentStatus(courseId);
      const payload =
        unwrapEnrollmentData<EnrollmentStatusResponse>(response);

      if (payload.enrolled) {
        router.replace(`/learning/courses/${courseId}`);
      }
    } catch {
      // Không chặn checkout nếu check status lỗi.
    } finally {
      setCheckingEnrollment(false);
    }
  }

  async function handleCreateSimulationPayment() {
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");
      setPaymentStatusText("");

      const response = await paymentService.createSimulationPayment(courseId);
      const payload = unwrapData<SimulationPaymentResponse>(response);

      setPayment(payload.payment);
      setPaymentStatusText(payload.status);

      if (payload.status === "success" || payload.status === "already_paid") {
        setSuccessMessage("Payment already completed.");
        router.push(`/learning/courses/${courseId}`);
        return;
      }

      setSuccessMessage(
        "Simulation payment created. You can confirm it to test successful payment."
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to create simulation payment."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmSimulationPayment() {
    if (!payment?.id) return;

    try {
      setConfirming(true);
      setError("");
      setSuccessMessage("");

      const response = await paymentService.confirmSimulationPayment(payment.id);
      const payload = unwrapData<SimulationPaymentResponse>(response);

      setPayment(payload.payment);
      setPaymentStatusText(payload.status);

      setSuccessMessage("Payment confirmed successfully.");
      router.push(`/learning/courses/${courseId}`);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to confirm simulation payment."
      );
    } finally {
      setConfirming(false);
    }
  }

  async function handleFailSimulationPayment() {
    if (!payment?.id) return;

    try {
      setConfirming(true);
      setError("");
      setSuccessMessage("");

      const response = await paymentService.failSimulationPayment(payment.id);
      const payload = unwrapData<SimulationPaymentResponse>(response);

      setPayment(payload.payment);
      setPaymentStatusText(payload.status);

      setError("Simulation payment was marked as failed.");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to mark payment as failed."
      );
    } finally {
      setConfirming(false);
    }
  }

  async function handleCreateVnpayPaymentUrl() {
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      const response = await paymentService.createVnpayPaymentUrl({
        courseId,
        bankCode: bankCode || undefined,
        locale,
      });

      const payload = unwrapData<VnpayCreatePaymentUrlResponse>(response);
      const paymentUrl = getPaymentUrl(payload);

      if (!paymentUrl) {
        throw new Error("Backend did not return a VNPAY payment URL.");
      }

      window.location.href = paymentUrl;
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to create VNPAY payment URL."
      );
    } finally {
      setLoading(false);
    }
  }

  function handlePay() {
    if (selectedMethod === "simulation") {
      handleCreateSimulationPayment();
      return;
    }

    handleCreateVnpayPaymentUrl();
  }

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace(
        `/auth?tab=login&redirect=${encodeURIComponent(
          `/checkout/${courseId}${slug ? `?slug=${slug}` : ""}`
        )}`
      );
      return;
    }

    if (!isLearner) {
      setError("Only learner accounts can buy courses.");
      return;
    }

    checkAlreadyEnrolled();
  }, [authLoading, user, courseId, slug]);

  if (authLoading || checkingEnrollment) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking checkout information...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => router.push(backUrl)}
          className="mb-6 inline-flex items-center rounded-full border bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to course
        </button>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <div>
              <p className="text-sm font-medium text-indigo-600">Checkout</p>
              <h1 className="mt-2 text-3xl font-bold text-zinc-950">
                Choose payment method
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                Select simulation for testing or VNPAY for real payment flow.
              </p>
            </div>

            {error && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {Array.isArray(error) ? error.join(", ") : error}
              </div>
            )}

            {successMessage && (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            )}

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setSelectedMethod("simulation")}
                className={`rounded-2xl border p-5 text-left transition ${
                  selectedMethod === "simulation"
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "bg-white hover:bg-zinc-50"
                }`}
              >
                <TestTube2 className="h-7 w-7" />
                <h2 className="mt-4 font-semibold">Simulation Payment</h2>
                <p
                  className={`mt-2 text-sm leading-6 ${
                    selectedMethod === "simulation"
                      ? "text-zinc-200"
                      : "text-zinc-500"
                  }`}
                >
                  Use this for development. Create a payment and confirm success
                  manually.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod("vnpay")}
                className={`rounded-2xl border p-5 text-left transition ${
                  selectedMethod === "vnpay"
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "bg-white hover:bg-zinc-50"
                }`}
              >
                <Smartphone className="h-7 w-7" />
                <h2 className="mt-4 font-semibold">VNPAY</h2>
                <p
                  className={`mt-2 text-sm leading-6 ${
                    selectedMethod === "vnpay"
                      ? "text-zinc-200"
                      : "text-zinc-500"
                  }`}
                >
                  Redirect learner to VNPAY gateway to complete the transaction.
                </p>
              </button>
            </div>

            {selectedMethod === "vnpay" && (
              <div className="mt-6 rounded-2xl border bg-zinc-50 p-5">
                <h3 className="font-semibold text-zinc-900">VNPAY Options</h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">
                      Locale
                    </label>
                    <select
                      value={locale}
                      onChange={(event) =>
                        setLocale(event.target.value as "vn" | "en")
                      }
                      className="h-10 w-full rounded-xl border bg-white px-3 text-sm"
                    >
                      <option value="vn">Vietnamese</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">
                      Bank Code optional
                    </label>
                    <input
                      value={bankCode}
                      onChange={(event) =>
                        setBankCode(event.target.value.toUpperCase())
                      }
                      placeholder="NCB, VCB..."
                      className="h-10 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:border-zinc-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {payment && (
              <div className="mt-6 rounded-2xl border bg-zinc-50 p-5">
                <h3 className="font-semibold text-zinc-900">
                  Simulation Payment Created
                </h3>

                <div className="mt-3 grid gap-2 text-sm text-zinc-600">
                  <p>
                    <span className="font-medium text-zinc-900">
                      Payment ID:
                    </span>{" "}
                    {payment.id}
                  </p>
                  <p>
                    <span className="font-medium text-zinc-900">Amount:</span>{" "}
                    {formatPrice(payment.amount)}
                  </p>
                  <p>
                    <span className="font-medium text-zinc-900">Status:</span>{" "}
                    {payment.status || paymentStatusText}
                  </p>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleConfirmSimulationPayment}
                    disabled={confirming}
                    className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {confirming ? "Confirming..." : "Confirm Success"}
                  </button>

                  <button
                    type="button"
                    onClick={handleFailSimulationPayment}
                    disabled={confirming}
                    className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Mark Failed
                  </button>
                </div>
              </div>
            )}

            {!payment && (
              <button
                type="button"
                onClick={handlePay}
                disabled={loading || Boolean(user && !isLearner)}
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    {selectedMethod === "simulation"
                      ? "Create Simulation Payment"
                      : "Continue to VNPAY"}
                  </>
                )}
              </button>
            )}
          </section>

          <aside className="rounded-3xl border bg-white p-6 shadow-sm lg:self-start">
            <h2 className="text-lg font-semibold text-zinc-950">
              Payment Summary
            </h2>

            <div className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">Course ID</span>
                <span className="max-w-[180px] truncate font-medium text-zinc-900">
                  {courseId}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">Method</span>
                <span className="font-medium uppercase text-zinc-900">
                  {selectedMethod}
                </span>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 text-zinc-600">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Payment is verified by backend before enrollment is granted.
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}