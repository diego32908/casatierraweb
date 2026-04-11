"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";

const inputCls =
  "w-full border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-stone-400 transition-colors";
const labelCls = "block text-[11px] uppercase tracking-[0.16em] text-stone-500 mb-1.5";

export default function SignupPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isPending, startTransition] = useTransition();

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    startTransition(async () => {
      const normalizedEmail = form.email.trim().toLowerCase();

      const { data, error: signUpError } = await supabaseBrowser.auth.signUp({
        email: normalizedEmail,
        password: form.password,
        options: {
          data: {
            first_name: form.firstName.trim(),
            last_name: form.lastName.trim(),
          },
        },
      });

      console.log("[signup] result:", {
        userId: data.user?.id,
        emailConfirmedAt: data.user?.email_confirmed_at,
        hasSession: !!data.session,
        error: signUpError?.message,
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Supabase is waiting for email confirmation — show the confirmation screen
      if (!data.session) {
        setConfirmed(true);
        return;
      }

      // Create profile row immediately after sign-up
      if (data.user) {
        const { error: profileError } = await supabaseBrowser.from("profiles").upsert({
          id: data.user.id,
          email: normalizedEmail,
          first_name: form.firstName.trim() || null,
          last_name: form.lastName.trim() || null,
        });
        console.log("[signup] profile upsert:", profileError?.message ?? "ok");
      }

      router.push("/account");
      router.refresh();
    });
  }

  if (confirmed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div style={{ width: "100%", maxWidth: 400 }} className="text-center">

          <Link href="/" className="text-[11px] uppercase tracking-[0.22em] text-stone-400 hover:text-stone-700 transition-colors">
            Tierra Oaxaca
          </Link>

          <div className="mt-14 mb-10">
            <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-stone-200">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M2.5 6.667L10 11.667L17.5 6.667M2.5 5H17.5V15H2.5V5Z" stroke="#78716c" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="text-xl font-medium text-stone-900 mb-3">Check your inbox</h1>
            <p className="text-sm text-stone-500 leading-relaxed">
              We sent a confirmation email to<br />
              <span className="text-stone-700 font-medium">{form.email}</span>
            </p>
          </div>

          <div className="border border-stone-100 bg-stone-50 px-6 py-5 text-left space-y-2.5 mb-8">
            <p className="text-xs text-stone-600 leading-relaxed">
              Please confirm your email to activate your account. Once confirmed, you can sign in normally.
            </p>
            <p className="text-xs text-stone-400 leading-relaxed">
              If you don&apos;t see it, check your spam or promotions folder.
            </p>
          </div>

          <div className="mb-10">
            <Link
              href="/auth/login"
              className="text-xs uppercase tracking-[0.16em] text-stone-400 hover:text-stone-700 transition-colors"
            >
              Back to sign in
            </Link>
          </div>

          <div className="border-t border-stone-100 pt-8">
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-300 mb-4">Follow us</p>
            <div className="flex items-center justify-center gap-6">
              <a
                href="https://www.instagram.com/yolotl_artemexicano"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] uppercase tracking-[0.14em] text-stone-400 hover:text-stone-700 transition-colors"
              >
                Instagram
              </a>
              <span className="text-stone-200">·</span>
              <a
                href="https://www.tiktok.com/@yolotlarte"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] uppercase tracking-[0.14em] text-stone-400 hover:text-stone-700 transition-colors"
              >
                TikTok
              </a>
              <span className="text-stone-200">·</span>
              <a
                href="https://www.etsy.com/shop/elzapatiadofolklor"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] uppercase tracking-[0.14em] text-stone-400 hover:text-stone-700 transition-colors"
              >
                Etsy
              </a>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div style={{ width: "100%", maxWidth: 400 }}>

        <div className="mb-10 text-center">
          <Link href="/" className="text-base font-medium tracking-[0.08em] text-stone-900 hover:text-stone-600 transition-colors">
            Tierra Oaxaca
          </Link>
          <p className="mt-6 text-xl font-medium text-stone-900">Create account</p>
        </div>

        {error && (
          <p className="mb-5 text-xs text-red-600 text-center">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>First name</label>
              <input
                className={inputCls}
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                placeholder="Jane"
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className={labelCls}>Last name</label>
              <input
                className={inputCls}
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                placeholder="Doe"
                autoComplete="family-name"
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              required
              type="email"
              className={inputCls}
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className={labelCls}>Password</label>
            <input
              required
              type="password"
              className={inputCls}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 w-full rounded-full bg-stone-900 py-3.5 text-sm font-medium tracking-wide text-white transition-colors hover:bg-stone-700 disabled:opacity-60"
          >
            {isPending ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-stone-400">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-stone-700 underline underline-offset-4 hover:text-stone-900">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  );
}
