import Link from "next/link";
import { Search, Heart, ShoppingBag } from "lucide-react";
import { BRAND_NAME, STORE_NAV } from "@/lib/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
    <header className="sticky top-0 z-40 border-b border-stone-300 bg-stone-50/95 backdrop-blur">
      {showBar && (
        <div className="bg-stone-900 py-2 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-white">
          {bar!.url ? (
            <Link href={bar!.url} className="hover:underline">
              {bar!.text}
            </Link>
          ) : (
            <span>{bar!.text}</span>
          )}
        </div>
      )}
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 md:px-8">
        <nav className="hidden md:flex items-center gap-7 text-[12px] tracking-[0.22em] text-stone-700">
          {STORE_NAV.map((item) => (
            <Link
              key={item}
              href={`/${item.toLowerCase()}`}
              className="uppercase hover:text-stone-950"
            >
              {item}
            </Link>
          ))}
        </nav>

        <div className="absolute left-1/2 -translate-x-1/2 text-center">
          <Link
            href="/"
            className="font-serif text-3xl tracking-[0.22em] text-stone-800"
          >
            {BRAND_NAME}
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-4 text-stone-700">
          <button aria-label="Search"><Search className="h-4 w-4" /></button>
          <button aria-label="Favorites"><Heart className="h-4 w-4" /></button>
          <button aria-label="Cart"><ShoppingBag className="h-4 w-4" /></button>
        </div>
      </div>
    </header>
  );
}
