import Link from "next/link";
import { STORE_NAV } from "@/lib/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CartBagButton } from "./cart-bag-button";
import { LogoLink } from "./logo-link";
import { WishlistHeaderButton } from "./wishlist-header-button";
import { SearchPanel } from "./search-panel";
import { ProfileHeaderButton } from "./profile-header-button";
import { LanguageToggle } from "./language-toggle";

async function getAnnouncementBar() {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "announcement_bar")
      .single();
    return data?.value as { enabled?: boolean; text?: string; url?: string | null } | null;
  } catch {
    return null;
  }
}

export async function SiteHeader() {
  const bar = await getAnnouncementBar();
  const showBar = bar?.enabled && bar.text;

  return (
    <header className="sticky top-0 z-40 border-b border-divide bg-bone/95 backdrop-blur">
      {/* ── Announcement bar ── */}
      {showBar && (
        <div className="overflow-hidden bg-stone-900 py-2.5" aria-label={bar!.text}>
          <div className="animate-marquee flex items-center whitespace-nowrap">
            {([0, 1] as const).map((half) =>
              [...Array(8)].map((_, i) =>
                bar!.url ? (
                  <Link
                    key={`${half}-${i}`}
                    href={bar!.url!}
                    aria-hidden={half === 1 ? true : undefined}
                    className="shrink-0 px-8 text-[11px] font-medium uppercase tracking-[0.18em] text-white hover:underline"
                  >
                    {bar!.text}
                    <span className="ml-8 text-white/30" aria-hidden>·</span>
                  </Link>
                ) : (
                  <span
                    key={`${half}-${i}`}
                    aria-hidden={half === 1 ? true : undefined}
                    className="shrink-0 px-8 text-[11px] font-medium uppercase tracking-[0.18em] text-white"
                  >
                    {bar!.text}
                    <span className="ml-8 text-white/30" aria-hidden>·</span>
                  </span>
                )
              )
            )}
          </div>
        </div>
      )}

      {/*
        Desktop: 3-column flex — [fixed spacer w-44] [center: logo + nav] [fixed icons w-44]
        Mobile: 2-column — [logo flex-1] [icons]
      */}
      <div className="mx-auto flex max-w-7xl items-stretch px-4 md:px-10">

        {/* Left spacer — desktop only (keeps logo centered above nav) */}
        <div className="hidden md:block md:w-44 shrink-0" />

        {/* Center: wordmark (+ desktop nav) */}
        <div className="flex flex-1 flex-col py-3.5 md:items-center md:py-5 md:gap-3">
          <LogoLink />

          {/* Desktop nav — hidden on mobile */}
          <nav className="hidden md:flex items-center gap-7 text-[11px] font-medium uppercase tracking-[0.25em] text-stone-400">
            {STORE_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors duration-150 hover:text-stone-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: utility icons */}
        <div className="flex items-center justify-end gap-4 shrink-0 text-stone-500 md:w-44 md:gap-5">
          <LanguageToggle />
          <SearchPanel />
          <ProfileHeaderButton />
          <WishlistHeaderButton />
          <CartBagButton />
        </div>

      </div>

      {/* ── Mobile nav strip — horizontal scroll, hidden on md+ ── */}
      <nav className="scrollbar-hide md:hidden flex items-center overflow-x-auto gap-5 px-4 pb-3 border-t border-stone-100">
        {STORE_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 text-[11px] font-medium uppercase tracking-[0.22em] text-stone-400 transition-colors hover:text-stone-900 py-0.5"
          >
            {item.label}
          </Link>
        ))}
      </nav>

    </header>
  );
}
