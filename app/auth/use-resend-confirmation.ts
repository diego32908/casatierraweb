"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export type ResendStatus = "idle" | "sending" | "sent" | "error";

export const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Shared hook for resending Supabase signup confirmation emails.
 *
 * Enforces a 60-second cooldown after each send to prevent Supabase's
 * silent rate-limiting (which returns no error but never sends the email
 * when called too rapidly after a previous send).
 */
export function useResendConfirmation() {
  const [status, setStatus] = useState<ResendStatus>("idle");
  const [countdown, setCountdown] = useState(0);

  // Tick the countdown down by 1 each second until it reaches 0
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const canResend = countdown === 0 && status !== "sending";

  async function resend(email: string) {
    if (!canResend) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    setStatus("sending");

    const { error } = await supabaseBrowser.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      // Don't start cooldown on error so the user can try again immediately
    } else {
      setStatus("sent");
      setCountdown(RESEND_COOLDOWN_SECONDS);
    }
  }

  return { status, countdown, canResend, resend };
}
