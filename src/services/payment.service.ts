import api from "@/lib/api";

export type PaymentStatus =
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | string;

export type PaymentMethod = "VNPAY" | "SIMULATION" | string;

export type PaymentResponse = {
  id: string;
  userId: string;
  courseId: string;
  amount: number;
  currency?: string;
  paymentMethod?: PaymentMethod;
  status: PaymentStatus;
  provider?: string | null;
  txnRef?: string | null;
  providerPaymentId?: string | null;
  paidAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type SimulationPaymentResponse = {
  status: "pending" | "success" | "failed" | "already_paid" | string;
  payment: PaymentResponse;
};

export type VnpayCreatePaymentUrlResponse = {
  paymentUrl?: string;
  url?: string;
  redirectUrl?: string;
  payment?: PaymentResponse;
};

export type VnpayReturnResponse = {
  status: "success" | "failed" | "already_paid" | string;
  payment: PaymentResponse;
};

export type VnpayRefundResponse = {
  status?: string;
  payment?: PaymentResponse;
  message?: string;
};

export function unwrapData<T>(response: any): T {
  return response?.data?.data ?? response?.data ?? response;
}

export const paymentService = {
  createSimulationPayment(courseId: string) {
    return api.post("/v1/payments/simulation/create-payment", {
      courseId,
    });
  },

  confirmSimulationPayment(paymentId: string) {
    return api.post(`/v1/payments/simulation/${paymentId}/confirm`);
  },

  failSimulationPayment(paymentId: string) {
    return api.post(`/v1/payments/simulation/${paymentId}/fail`);
  },

  createVnpayPaymentUrl(payload: {
    courseId: string;
    bankCode?: string;
    locale?: "vn" | "en";
  }) {
    return api.post("/v1/payments/vnpay/create-payment-url", payload);
  },

  handleVnpayReturn(queryString: string) {
    return api.get(`/v1/payments/vnpay/return?${queryString}`);
  },

  refundVnpayPayment(payload: {
    paymentId: string;
    amount: number;
    transactionType: "02" | "03";
    reason?: string;
  }) {
    return api.post("/v1/payments/vnpay/refund", payload);
  },
};