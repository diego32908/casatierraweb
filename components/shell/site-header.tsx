import Link from "next/link";
import { STORE_NAV } from "@/lib/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CartBagButton } from "./cart-bag-button";
import { LogoLink } from "./logo-link";
import { WishlistHeaderButton } from "./wishlist-header-button";
import { SearchPanel } from "./search-panel";
import { ProfileHeaderButton } from "./profile-header-button";

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
        3-column flex: [fixed-width spacer] [center: logo + nav, auto] [fixed-width icons]
        Both side columns use the same fixed width (w-44 = 176px) so centering is
        guaranteed and the icon cluster always has a clear buffer from the nav edge.
      */}
      <div className="mx-auto flex max-w-7xl items-stretch px-10">

        {/* Left spacer — fixed width matching the icon column for true centering */}
        <div className="w-44 shrink-0" />

        {/* Center: wordmark + nav */}
        <div className="flex flex-1 flex-col items-center py-5 gap-3">

          {/* Wordmark */}
          <LogoLink />

          {/* Primary nav — centered below wordmark */}
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

        {/* Right: utility icons — fixed width, right-aligned within the column */}
        <div className="flex w-44 shrink-0 items-center justify-end gap-5 text-stone-500">
          <SearchPanel />
          <ProfileHeaderButton />
          <WishlistHeaderButton />
          <CartBagButton />
        </div>

      </div>
    </header>
  );
}
