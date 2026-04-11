"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";

const inputCls =
  "w-full border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-stone-400 transition-colors";
const labelCls = "block text-[11px] uppercase tracking-[0.16em] text-stone-500 mb-1.5";

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
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
          // Points to our callback route so confirmation auto-signs the user in
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            first_name: form.firstName.trim(),
            last_name: form.lastName.trim(),
          },
        },
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

      // Email confirmation is disabled — create profile and go to account
      if (data.user) {
        await supabaseBrowser.from("profiles").upsert({
          id: data.user.id,
          email: normalizedEmail,
          first_name: form.firstName.trim() || null,
          last_name: form.lastName.trim() || null,
        });
      }

      router.push("/account");
      router.refresh();
    });
  }

  if (confirmed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-stone-50">
        <div style={{ width: "100%", maxWidth: 420 }}>

          <div className="text-center mb-12">
            <Link href="/" className="text-base font-medium tracking-[0.08em] text-stone-900 hover:text-stone-600 transition-colors">
              Tierra Oaxaca
            </Link>
          </div>

          <div className="bg-white border border-stone-200 px-10 py-12 text-center">

            {/* Envelope mark */}
            <div className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-full border border-stone-100 bg-stone-50">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#78716c" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M2 7l10 7 10-7"/>
              </svg>
            </div>

            <h1 className="text-xl font-medium text-stone-900 mb-2 tracking-[-0.01em]">
              Check your inbox
            </h1>
            <p className="text-[13px] text-stone-400 mb-8 leading-relaxed">
              We sent a confirmation link to<br />
              <span className="text-stone-700 font-medium">{form.email}</span>
            </p>

            <div className="border-t border-stone-100 pt-6 mb-6">
              <p className="text-[13px] text-stone-600 leading-relaxed">
                Click the link in that email to activate your account.
                You&apos;ll be signed in automatically.
              </p>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              Don&apos;t see it? Check your spam or promotions folder.
            </p>

          </div>

          <div className="mt-8 text-center">
            <Link
              href="/auth/login"
              className="text-[11px] uppercase tracking-[0.18em] text-stone-400 hover:text-stone-700 transition-colors"
            >
              Back to sign in
            </Link>
          </div>

          <div className="mt-12 text-center">
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
            <div className="relative">
              <input
                required
                type={showPassword ? "text" : "password"}
                className={`${inputCls} pr-10`}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
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
