"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/server-auth";
import { checkRateLimit, clientIP } from "@/lib/rate-limit";
import { Resend } from "resend";

const FROM_CONTACT = process.env.EMAIL_FROM!;

export interface ContactSubmission {
  name: string;
  email: string;
  inquiry_type: string;
  message: string;
}

const VALID_INQUIRY_TYPES = ["general", "bulk", "custom", "support"] as const;
type InquiryType = typeof VALID_INQUIRY_TYPES[number];

const TYPE_LABELS: Record<InquiryType, string> = {
  general: "General",
  bulk:    "Bulk Order",
  custom:  "Custom Request",
  support: "Support",
};

async function sendAdminNotification(data: ContactSubmission & { created_at: string }) {
  const apiKey   = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!apiKey || !adminEmail) return; // silently skip if not configured

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from:     FROM_CONTACT,
      to:       adminEmail,
      replyTo: data.email,
      subject: `New inquiry — ${TYPE_LABELS[data.inquiry_type as InquiryType] ?? data.inquiry_type}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;color:#111">
          <h2 style="font-size:18px;margin-bottom:24px">New contact submission</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#555;width:120px">Name</td><td style="padding:8px 0">${data.name}</td></tr>
            <tr><td style="padding:8px 0;color:#555">Email</td><td style="padding:8px 0"><a href="mailto:${data.email}">${data.email}</a></td></tr>
            <tr><td style="padding:8px 0;color:#555">Type</td><td style="padding:8px 0">${TYPE_LABELS[data.inquiry_type as InquiryType] ?? data.inquiry_type}</td></tr>
            <tr><td style="padding:8px 0;color:#555;vertical-align:top">Message</td><td style="padding:8px 0;white-space:pre-wrap">${data.message}</td></tr>
            <tr><td style="padding:8px 0;color:#555">Received</td><td style="padding:8px 0;color:#888">${new Date(data.created_at).toLocaleString("en-US")}</td></tr>
          </table>
          <p style="margin-top:24px;font-size:12px;color:#aaa">
            View in admin → /admin/leads
          </p>
        </div>
      `,
    });
  } catch {
    // Email failure must never break form submission — log silently
    console.warn("[contact] admin notification failed — submission still saved");
  }
}

export async function submitContact(
  data: ContactSubmission
): Promise<{ error?: string }> {
  if (!VALID_INQUIRY_TYPES.includes(data.inquiry_type as InquiryType)) {
    return { error: "Invalid inquiry type." };
  }

  const ip = await clientIP();
  if (!checkRateLimit(`contact:${ip}`, 3, 10 * 60_000)) {
    return { error: "Too many requests. Please try again later." };
  }

  const supabase = createServerSupabaseClient();

  const { data: row, error } = await supabase
    .from("contact_submissions")
    .insert({
      name:         data.name.trim(),
      email:        data.email.trim().toLowerCase(),
      inquiry_type: data.inquiry_type,
      message:      data.message.trim(),
    })
    .select("created_at")
    .single();

  if (error) return { error: error.message };

  // Fire email — non-blocking, failure does not propagate
  await sendAdminNotification({ ...data, created_at: row.created_at });

  return {};
}

export async function updateSubmissionStatus(
  id: string,
  status: "new" | "read" | "resolved"
): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("contact_submissions")
    .update({ status })
    .eq("id", id);
  if (error) return { error: error.message };
  return {};
}
