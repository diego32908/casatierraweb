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


export default async function HomePage() {
  const supabase = createServerSupabaseClient();

  const [{ data: featured }, { data: selected }, { data: siteSettings }] =
    await Promise.all([
      // Best Sellers — featured products, 2 rows of 4 (8 total)
      supabase
        .from("products")
        .select("id, slug, name_en, name_es, base_price_cents, compare_at_price_cents, primary_image_url, variants:product_variants(color_name, color_hex)")
        .eq("is_active", true)
        .eq("featured", true)
        .order("sort_order", { ascending: true })
        .limit(8),
      // Selected Pieces — curated cross-category selection, 2 rows of 4 (8 total)
      supabase
        .from("products")
        .select("id, slug, name_en, name_es, base_price_cents, compare_at_price_cents, primary_image_url, variants:product_variants(color_name, color_hex)")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(8),
      supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["hero", "editorial_break"]),
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

          {/* Right: manifesto panel — fully clickable */}
          <Link
            href={hero.cta_url ?? "/shop"}
            className="group flex flex-col justify-center border-t border-stone-200 bg-[rgb(var(--background))] px-6 py-10 md:border-l md:border-t-0 md:px-10 md:py-0"
          >
            {/* Coordinates tag */}
            <p className="mb-8 text-[10px] uppercase tracking-[0.32em] text-stone-400">
              Oaxaca, 17.06° N
            </p>

            {/* Title */}
            <h2 className="mb-7 font-serif italic text-[1.75rem] leading-[1.25] text-stone-900">
              Artisans of the Sun
            </h2>

            {/* Manifesto body */}
            <p className="mb-10 max-w-[210px] text-[13px] leading-[1.9] text-stone-500">
              Shaped from valley clay and threaded on looms older than memory,
              each piece carries the knowledge of the hands that made it.
              We work with Oaxacan artisans for whom craft is not a trade — it is inheritance.
            </p>

            {/* CTA — text-link style, no button box */}
            <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-stone-800 underline underline-offset-4 decoration-1 transition-all duration-200 group-hover:gap-3 group-hover:text-stone-900">
              Explore the Collection
              <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>
      </section>

      {/* ── 2. Best Sellers — 2 rows of 4 (8 total) ──────────── */}
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
        <div className="mx-auto max-w-7xl px-4 py-10 md:py-20 md:px-8">
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

      {/* ── 5. Selected Pieces — 2 rows of 4 (8 total) ────────── */}
      {selected && selected.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
          <div className="mb-8 flex items-baseline justify-between">
            <p className="upper-nav">Selected Pieces</p>
            <Link
              href="/shop"
              className="text-[11px] uppercase tracking-[0.22em] text-stone-500 transition-colors hover:text-stone-900"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {selected.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* ── 6. About / Story ───────────────────────────────── */}
      <section className="border-t border-stone-200 py-14 md:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-10 md:gap-16 px-4 md:grid-cols-2 md:px-8">
          <div>
            <p className="upper-nav mb-6">Our Story</p>
            <h2 className="mb-7 font-serif text-3xl md:text-4xl leading-tight text-stone-900">
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
