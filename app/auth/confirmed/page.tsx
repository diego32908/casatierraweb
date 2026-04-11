"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ConfirmedPage() {
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      setIsSignedIn(!!session);
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-stone-50">
      <div style={{ width: "100%", maxWidth: 420 }}>

        <div className="text-center mb-12">
          <Link
            href="/"
            className="text-base font-medium tracking-[0.08em] text-stone-900 hover:text-stone-600 transition-colors"
          >
            Tierra Oaxaca
          </Link>
        </div>

        <div className="bg-white border border-stone-200 px-10 py-12 text-center">

          {/* Check mark */}
          <div className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-full border border-stone-100 bg-stone-50">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#78716c"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h1 className="text-xl font-medium text-stone-900 mb-2 tracking-[-0.01em]">
            Your account is active
          </h1>
          <p className="text-[13px] text-stone-400 mb-10 leading-relaxed">
            Your email has been confirmed.<br />
            You&apos;re all set.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/shop"
              className="w-full rounded-full bg-stone-900 py-3 text-xs font-medium tracking-[0.12em] uppercase text-white hover:bg-stone-700 transition-colors text-center"
            >
              Continue shopping
            </Link>
            <Link
              href={isSignedIn ? "/account" : "/auth/login"}
              className="w-full rounded-full border border-stone-200 py-3 text-xs font-medium tracking-[0.12em] uppercase text-stone-700 hover:border-stone-400 transition-colors text-center"
            >
              {isSignedIn ? "Go to account" : "Sign in"}
            </Link>
          </div>

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
