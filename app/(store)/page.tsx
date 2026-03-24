import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/product/product-card";

// Fallback content — used when site_settings has no value set yet
const HERO_DEFAULTS = {
  image_url: null as string | null,
  heading: "Artisan Made\nWith Purpose",
  subheading:
    "Handcrafted clothing, shoes, and cultural pieces rooted in Oaxacan tradition.",
  cta_label: "Shop Designs",
  cta_url: "/shop",
};

const EDITORIAL_DEFAULTS = {
  image_url: null as string | null,
};

// Static category definitions — image_url is overlaid from site_settings at runtime
const CATEGORIES = [
  { key: "shoes",   label: "Shoes",        hint: "Footwear",        href: "/shop" },
  { key: "apparel", label: "Apparel",      hint: "Clothing",        href: "/shop" },
  { key: "home",    label: "Home & Goods", hint: "Pottery & Décor", href: "/shop" },
] as const;

export default async function HomePage() {
  const supabase = createServerSupabaseClient();

  const [{ data: featured }, { data: latest }, { data: siteSettings }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, slug, name_en, base_price_cents, compare_at_price_cents, primary_image_url, variants:product_variants(color_name, color_hex)")
        .eq("is_active", true)
        .eq("featured", true)
        .order("sort_order", { ascending: true })
        .limit(8),
      supabase
        .from("products")
        .select("id, slug, name_en, base_price_cents, compare_at_price_cents, primary_image_url, variants:product_variants(color_name, color_hex)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(4),
      supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["hero", "editorial_break", "category_cards"]),
    ]);

  // Merge DB values over defaults — falls back gracefully if table is empty
  const settingsMap = Object.fromEntries(
    (siteSettings ?? []).map((r) => [r.key, r.value])
  );

  const hero = { ...HERO_DEFAULTS, ...(settingsMap["hero"] ?? {}) } as typeof HERO_DEFAULTS;
  const editorial = {
    ...EDITORIAL_DEFAULTS,
    ...(settingsMap["editorial_break"] ?? {}),
  } as typeof EDITORIAL_DEFAULTS;

  // Build a cardKey → image_url lookup from DB; falls back to null per card
  type CardRow = { key: string; image_url: string | null };
  const dbCards: CardRow[] =
    (settingsMap["category_cards"] as { cards?: CardRow[] } | undefined)?.cards ?? [];
  const cardImageMap = Object.fromEntries(dbCards.map((c) => [c.key, c.image_url]));

  // Split heading at \n for the line break in the hero panel
  const [heroLine1, heroLine2] = (hero.heading ?? "").split("\n");

  return (
    <div>
      {/* ── 1. Split Hero ──────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <div className="grid overflow-hidden border border-stone-200 md:grid-cols-[1.4fr_0.6fr]">
          {/* Left: hero image (or placeholder) */}
          <div className="relative aspect-[4/5] overflow-hidden bg-stone-100 md:aspect-auto md:min-h-[78vh]">
            {hero.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hero.image_url}
                alt="Hero"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[11px] uppercase tracking-[0.22em] text-stone-400">
                Editorial Image
              </div>
            )}
          </div>

          {/* Right: text panel — fully clickable */}
          <Link
            href={hero.cta_url ?? "/shop"}
            className="group flex flex-col justify-center border-t border-stone-200 bg-[rgb(var(--background))] px-10 py-14 md:border-l md:border-t-0 md:py-0"
          >
            <p className="upper-nav mb-6">New Collection</p>
            <h2 className="mb-7 font-serif text-[2.4rem] leading-[1.15] text-stone-900">
              {heroLine2 ? (
                <>
                  {heroLine1}
                  <br />
                  {heroLine2}
                </>
              ) : (
                heroLine1
              )}
            </h2>
            {hero.subheading && (
              <p className="mb-10 max-w-[270px] text-sm leading-7 text-stone-600">
                {hero.subheading}
              </p>
            )}
            <span className="inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.22em] text-stone-900 transition-all duration-200 group-hover:gap-3">
              {hero.cta_label}
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>
      </section>

      {/* ── 2. Category Cards ──────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-14 md:px-8">
        <p className="upper-nav mb-8">Shop by Category</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {CATEGORIES.map((cat) => {
            const imageUrl = cardImageMap[cat.key] ?? null;
            return (
              <Link
                key={cat.key}
                href={cat.href}
                className="group relative block aspect-[3/4] overflow-hidden bg-stone-100"
              >
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={cat.label}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-stone-200 transition-transform duration-700 ease-out group-hover:scale-105" />
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-7 transition-transform duration-300 group-hover:-translate-y-1">
                  <div>
                    <p className="mb-1.5 text-[10px] uppercase tracking-[0.22em] text-stone-600">
                      {cat.hint}
                    </p>
                    <h3 className="text-2xl font-semibold text-stone-900">{cat.label}</h3>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-800 transition-all duration-200 group-hover:border-stone-900 group-hover:bg-stone-900">
                    <ArrowRight className="h-3.5 w-3.5 text-stone-800 transition-colors duration-200 group-hover:translate-x-px group-hover:text-white" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── 3. Best Sellers ────────────────────────────────── */}
      {featured && featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
          <div className="mb-8 flex items-baseline justify-between">
            <p className="upper-nav">Best Sellers</p>
            <Link
              href="/shop"
              className="text-[11px] uppercase tracking-[0.22em] text-stone-500 transition-colors hover:text-stone-900"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* ── 4. Editorial Image Break ───────────────────────── */}
      <section className="bg-stone-100 py-1">
        <div className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          {editorial.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={editorial.image_url}
              alt="Editorial"
              className="aspect-[16/7] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[16/7] items-center justify-center bg-stone-200 text-[11px] uppercase tracking-[0.22em] text-stone-400">
              Lifestyle Image
            </div>
          )}
        </div>
      </section>

      {/* ── 5. New Arrivals ────────────────────────────────── */}
      {latest && latest.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
          <div className="mb-8 flex items-baseline justify-between">
            <p className="upper-nav">New Arrivals</p>
            <Link
              href="/shop"
              className="text-[11px] uppercase tracking-[0.22em] text-stone-500 transition-colors hover:text-stone-900"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {latest.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* ── 6. About / Story ───────────────────────────────── */}
      <section className="border-t border-stone-200 py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-4 md:grid-cols-2 md:px-8">
          <div>
            <p className="upper-nav mb-6">Our Story</p>
            <h2 className="mb-7 font-serif text-4xl leading-tight text-stone-900">
              Rooted in Oaxaca.<br />
              Made with craft.
            </h2>
            <p className="max-w-md text-sm leading-8 text-stone-600">
              Casa Tierra is a boutique curating handcrafted pieces that carry cultural meaning.
              Every item is made by artisans using traditional methods — clothing, shoes, pottery,
              and home goods made with soul.
            </p>
            <div className="mt-10">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.22em] text-stone-900 transition-all duration-200 hover:gap-3"
              >
                Explore the Collection
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <div className="flex aspect-square items-center justify-center bg-stone-100 text-[11px] uppercase tracking-[0.22em] text-stone-400">
            Brand Image
          </div>
        </div>
      </section>
    </div>
  );
}
