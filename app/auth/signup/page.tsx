"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useResendConfirmation } from "@/app/auth/use-resend-confirmation";

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
  const { status: resendStatus, countdown, canResend, resend } = useResendConfirmation();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Flow states
  const [stage, setStage] = useState<"form" | "codeEntry" | "verified">("form");
  const [existingUnconfirmed, setExistingUnconfirmed] = useState(false);

  // Code entry
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const [isPending, startTransition] = useTransition();

  // Auto-focus code input when codeEntry stage is shown
  useEffect(() => {
    if (stage === "codeEntry") {
      codeInputRef.current?.focus();
    }
  }, [stage]);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // ── Signup form submit ────────────────────────────────────────────────────
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
          // emailRedirectTo omitted — OTP flow, no redirect link needed
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

      // Already confirmed (e.g. email auto-confirmed in dev)
      if (data.session) {
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
        return;
      }

      // Existing unconfirmed account
      if ((data.user?.identities?.length ?? 0) === 0) {
        setExistingUnconfirmed(true);
      }

      setStage("codeEntry");
    });
  }

  // ── Code verification ─────────────────────────────────────────────────────
  async function verifyCode(value: string) {
    if (isVerifying) return;
    setCodeError(null);
    setIsVerifying(true);

    const normalizedEmail = form.email.trim().toLowerCase();

    const { data, error: verifyError } = await supabaseBrowser.auth.verifyOtp({
      email: normalizedEmail,
      token: value.trim(),
      type: "signup",
    });

    if (verifyError) {
      setIsVerifying(false);
      const msg = verifyError.message.toLowerCase();
      if (msg.includes("rate") || msg.includes("attempts")) {
        setCodeError("Too many attempts. Please request a new code and try again.");
      } else {
        setCodeError("That code didn't work. It may have expired — request a new one below.");
      }
      setCode("");
      codeInputRef.current?.focus();
      return;
    }

    // Upsert profile on successful verification
    if (data.user) {
      await supabaseBrowser.from("profiles").upsert({
        id: data.user.id,
        email: normalizedEmail,
        first_name: form.firstName.trim() || null,
        last_name: form.lastName.trim() || null,
      });
    }

    setIsVerifying(false);
    setStage("verified");
  }

  // Handle code input changes — strip non-digits, no auto-submit
  function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    setCode(digits);
    setCodeError(null);
  }

  // ── Socials footer ───────────────────────────────────────────────────────
  const socials = (
    <div className="mt-12 text-center">
      <p className="text-[10px] uppercase tracking-[0.2em] text-stone-300 mb-4">Follow us</p>
      <div className="flex items-center justify-center gap-6">
        <a href="https://www.instagram.com/yolotl_artemexicano" target="_blank" rel="noopener noreferrer" className="text-[11px] uppercase tracking-[0.14em] text-stone-400 hover:text-stone-700 transition-colors">Instagram</a>
        <span className="text-stone-200">·</span>
        <a href="https://www.tiktok.com/@yolotlarte" target="_blank" rel="noopener noreferrer" className="text-[11px] uppercase tracking-[0.14em] text-stone-400 hover:text-stone-700 transition-colors">TikTok</a>
        <span className="text-stone-200">·</span>
        <a href="https://www.etsy.com/shop/elzapatiadofolklor" target="_blank" rel="noopener noreferrer" className="text-[11px] uppercase tracking-[0.14em] text-stone-400 hover:text-stone-700 transition-colors">Etsy</a>
      </div>
    </div>
  );

  // ── Verified ──────────────────────────────────────────────────────────────
  if (stage === "verified") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-stone-50">
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div className="text-center mb-12">
            <Link href="/" className="text-base font-medium tracking-[0.08em] text-stone-900 hover:text-stone-600 transition-colors">Tierra Oaxaca</Link>
          </div>
          <div className="bg-white border border-stone-200 px-10 py-12 text-center">
            <div className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-full border border-stone-100 bg-stone-50">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#78716c" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="text-xl font-medium text-stone-900 mb-2 tracking-[-0.01em]">Your account is verified.</h1>
            <p className="text-[13px] text-stone-400 mb-10 leading-relaxed">You&apos;re all set. Continue shopping or go to your account.</p>
            <div className="flex flex-col gap-3">
              <Link href="/shop" className="w-full rounded-full bg-stone-900 py-3 text-xs font-medium tracking-[0.12em] uppercase text-white hover:bg-stone-700 transition-colors text-center">Continue shopping</Link>
              <Link href="/account" className="w-full rounded-full border border-stone-200 py-3 text-xs font-medium tracking-[0.12em] uppercase text-stone-700 hover:border-stone-400 transition-colors text-center">Go to account</Link>
            </div>
          </div>
          {socials}
        </div>
      </div>
    );
  }

  // ── Code entry ────────────────────────────────────────────────────────────
  if (stage === "codeEntry") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-stone-50">
        <div style={{ width: "100%", maxWidth: 420 }}>

          <div className="text-center mb-12">
            <Link href="/" className="text-base font-medium tracking-[0.08em] text-stone-900 hover:text-stone-600 transition-colors">Tierra Oaxaca</Link>
          </div>

          <div className="bg-white border border-stone-200 px-10 py-12">
            <div className="text-center mb-8">
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-stone-100 bg-stone-50">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#78716c" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="M2 7l10 7 10-7"/>
                </svg>
              </div>

              {existingUnconfirmed ? (
                <>
                  <h1 className="text-xl font-medium text-stone-900 mb-2 tracking-[-0.01em]">Confirm your email to continue</h1>
                  <p className="text-[13px] text-stone-400 leading-relaxed">
                    <span className="font-medium text-stone-700">{form.email}</span> has a pending account.
                    Enter the confirmation code we just sent to activate it.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-xl font-medium text-stone-900 mb-2 tracking-[-0.01em]">Your account has been created.</h1>
                  <p className="text-[13px] text-stone-400 leading-relaxed">
                    Enter the confirmation code we emailed to{" "}
                    <span className="font-medium text-stone-700">{form.email}</span>{" "}
                    to activate it.
                  </p>
                </>
              )}
            </div>

            {/* Code input */}
            <div className="mb-4">
              <label className={labelCls}>Confirmation code</label>
              <input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                pattern="\d+"
                maxLength={10}
                autoComplete="one-time-code"
                value={code}
                onChange={handleCodeChange}
                disabled={isVerifying}
                placeholder="––––––––"
                className="w-full border border-stone-200 bg-white px-3 py-3 text-center font-mono text-xl tracking-[0.3em] text-stone-900 placeholder-stone-300 outline-none focus:border-stone-400 transition-colors disabled:opacity-50"
              />
            </div>

            {/* Error */}
            {codeError && (
              <p className="mb-4 text-xs text-red-500 text-center leading-relaxed">{codeError}</p>
            )}

            {/* Verify button (fallback for paste / slow typing) */}
            <button
              type="button"
              onClick={() => code.length >= 6 && verifyCode(code)}
              disabled={code.length < 6 || isVerifying}
              className="w-full rounded-full bg-stone-900 py-3 text-xs font-medium tracking-[0.12em] uppercase text-white hover:bg-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isVerifying ? "Verifying…" : "Confirm account"}
            </button>

            {/* Spam note */}
            <p className="mt-5 text-center text-[11px] text-stone-400 leading-relaxed">
              Don&apos;t see the email? Check your spam or promotions folder.
            </p>

            {/* Resend */}
            <div className="mt-4 text-center">
              {resendStatus === "sent" ? (
                <div className="space-y-1">
                  <p className="text-xs text-stone-600">A new code has been sent.</p>
                  <p className="text-[11px] text-stone-400">Previous codes are no longer valid.</p>
                  {countdown > 0 && (
                    <p className="text-[11px] text-stone-300 mt-1">Send again in {countdown}s</p>
                  )}
                </div>
              ) : resendStatus === "error" ? (
                <div className="space-y-1">
                  <p className="text-xs text-red-500">Couldn&apos;t send right now. Try again in a moment.</p>
                  <button
                    type="button"
                    onClick={() => resend(form.email)}
                    className="text-xs uppercase tracking-[0.14em] text-stone-500 hover:text-stone-700 transition-colors"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => resend(form.email)}
                  disabled={!canResend || resendStatus === "sending"}
                  className="text-xs uppercase tracking-[0.14em] text-stone-400 hover:text-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {resendStatus === "sending"
                    ? "Sending…"
                    : countdown > 0
                    ? `Send again in ${countdown}s`
                    : "Send a new code"}
                </button>
              )}
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link href="/auth/login" className="text-[11px] uppercase tracking-[0.18em] text-stone-400 hover:text-stone-700 transition-colors">
              Sign in instead
            </Link>
          </div>

          {socials}
        </div>
      </div>
    );
  }

  // ── Signup form ───────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div style={{ width: "100%", maxWidth: 400 }}>

        <div className="mb-10 text-center">
          <Link href="/" className="text-base font-medium tracking-[0.08em] text-stone-900 hover:text-stone-600 transition-colors">Tierra Oaxaca</Link>
          <p className="mt-6 text-xl font-medium text-stone-900">Create account</p>
        </div>

        {error && <p className="mb-5 text-xs text-red-600 text-center">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>First name</label>
              <input className={inputCls} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Jane" autoComplete="given-name" />
            </div>
            <div>
              <label className={labelCls}>Last name</label>
              <input className={inputCls} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Doe" autoComplete="family-name" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input required type="email" className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="your@email.com" autoComplete="email" />
          </div>
          <div>
            <label className={labelCls}>Password</label>
            <div className="relative">
              <input required type={showPassword ? "text" : "password"} className={`${inputCls} pr-10`} value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors" aria-label={showPassword ? "Hide password" : "Show password"}>
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          <button type="submit" disabled={isPending} className="mt-2 w-full rounded-full bg-stone-900 py-3.5 text-sm font-medium tracking-wide text-white transition-colors hover:bg-stone-700 disabled:opacity-60">
            {isPending ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-stone-400">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-stone-700 underline underline-offset-4 hover:text-stone-900">Sign in</Link>
        </p>

      </div>
    </div>
  );
}
