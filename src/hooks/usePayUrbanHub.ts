import { useState } from "react";
import { SUPABASE_URL } from "@/integrations/supabase/client";

const CREATE_PAYMENT_INTENT_URL = `${SUPABASE_URL}/functions/v1/create-payment-intent`;

export type PayUrbanHubFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  amountPounds: number;
  paymentType: "current_student" | "new_student" | "keyworker_pay";
};

const PAYMENT_TYPE_DESCRIPTION: Record<PayUrbanHubFormData["paymentType"], string> = {
  current_student: "Current student",
  new_student: "New student",
  keyworker_pay: "Keyworker pay",
};

export function getPaymentTypeDescription(type: PayUrbanHubFormData["paymentType"]): string {
  return PAYMENT_TYPE_DESCRIPTION[type];
}

export const usePayUrbanHub = () => {
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPaymentIntent = async (
    formData: PayUrbanHubFormData,
    supabaseAnonKey: string
  ): Promise<{ clientSecret: string } | null> => {
    setIsCreatingIntent(true);
    setError(null);
    try {
      const amountPence = Math.round(formData.amountPounds * 100);
      const description = getPaymentTypeDescription(formData.paymentType);

      const response = await fetch(CREATE_PAYMENT_INTENT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          amountPence,
          description,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create payment");
      }

      const raw = data.clientSecret;
      if (typeof raw !== "string" || !raw.trim()) {
        throw new Error("Invalid response from server");
      }
      // PaymentIntent client_secret must look like pi_xxx_secret_xxx (trim any whitespace)
      const clientSecret = raw.trim();
      if (!/^pi_[a-zA-Z0-9]+_secret_[a-zA-Z0-9]+/.test(clientSecret)) {
        throw new Error("Invalid payment response from server");
      }

      return { clientSecret };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      return null;
    } finally {
      setIsCreatingIntent(false);
    }
  };

  return { createPaymentIntent, isCreatingIntent, error };
};
