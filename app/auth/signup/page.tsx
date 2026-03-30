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

      // If session is null, Supabase is waiting for email confirmation
      if (!data.session) {
        setError("Check your email and click the confirmation link before signing in. (Or disable email confirmation in Supabase Dashboard → Authentication → Settings.)");
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div style={{ width: "100%", maxWidth: 400 }}>

        <div className="mb-10 text-center">
          <Link href="/" className="text-[11px] uppercase tracking-[0.22em] text-stone-400 hover:text-stone-700 transition-colors">
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
