import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/product/product-card";
import { fanOutByColor, type FannedProductCard } from "@/lib/product-fanout";

// Prefer unique parent products first, then allow a second variant per parent,
// then fall back to anything remaining (tiny-inventory safety net).
function pickWithDiversity(cards: FannedProductCard[], limit: number): FannedProductCard[] {
  const cardKey = (c: FannedProductCard) => `${c.id}:${c.variantId ?? ""}`;
  const selectedKeys = new Set<string>();
  const countByParent = new Map<string, number>();
  const selected: FannedProductCard[] = [];

  for (const card of cards) {
    if (selected.length >= limit) break;
    if (!countByParent.has(card.id)) {
      countByParent.set(card.id, 1);
      selectedKeys.add(cardKey(card));
      selected.push(card);
    }
  }

  if (selected.length < limit) {
    for (const card of cards) {
      if (selected.length >= limit) break;
      if (selectedKeys.has(cardKey(card))) continue;
      if ((countByParent.get(card.id) ?? 0) === 1) {
        countByParent.set(card.id, 2);
        selectedKeys.add(cardKey(card));
        selected.push(card);
      }
    }
  }

  if (selected.length < limit) {
    for (const card of cards) {
      if (selected.length >= limit) break;
      if (!selectedKeys.has(cardKey(card))) {
        selectedKeys.add(cardKey(card));
        selected.push(card);
      }
    }
  }

  return selected;
}

// Round-robin across product categories to maximize visual variety in the discovery row.
// Dedupes to one card per parent product before distributing.
function pickByCategoryDiversity(cards: FannedProductCard[], limit: number): FannedProductCard[] {
  const seen = new Set<string>();
  const unique = cards.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  const byCategory = new Map<string, FannedProductCard[]>();
  for (const card of unique) {
    const cat = card.category ?? "other";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(card);
  }

  const result: FannedProductCard[] = [];
  const cats = [...byCategory.keys()];
  const cursor = new Map(cats.map((c) => [c, 0]));

  while (result.length < limit) {
    let added = false;
    for (const cat of cats) {
      if (result.length >= limit) break;
      const pool = byCategory.get(cat)!;
      const idx = cursor.get(cat)!;
      if (idx < pool.length) {
        result.push(pool[idx]);
        cursor.set(cat, idx + 1);
        added = true;
      }
    }
    if (!added) break;
  }

  return result;
}

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

  const SELECT = "id, slug, name_en, name_es, base_price_cents, compare_at_price_cents, primary_image_url, variants:product_variants(id, color_name, color_hex, image_url, price_override_cents, is_default)";

  const [{ data: featuredRaw }, { data: fillRaw }, { data: siteSettings }] =
    await Promise.all([
      // Featured products anchor the Best Sellers grid (admin-curated)
      supabase
        .from("products")
        .select(SELECT)
        .eq("is_active", true)
        .eq("is_archived", false)
        .eq("featured", true)
        .order("sort_order", { ascending: true })
        .limit(8),
      // Fill pool — non-featured, shuffled in JS to keep homepage fresh
      supabase
        .from("products")
        .select(SELECT)
        .eq("is_active", true)
        .eq("is_archived", false)
        .eq("featured", false)
        .limit(24),
      supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["hero", "editorial_break"]),
    ]);

  // Featured cards anchor the grid (sort_order preserved); fill pool is shuffled for variety.
  // pickWithDiversity caps at 8, preferring one card per parent product first.
  const allCandidates = [
    ...fanOutByColor(featuredRaw ?? []),
    ...fanOutByColor([...(fillRaw ?? [])].sort(() => Math.random() - 0.5)),
  ];
  const bestSellers = pickWithDiversity(allCandidates, 8);

  // Discovery row: leftover candidates after bestSellers, deduplicated by parent product,
  // then distributed across categories for maximum visual variety.
  const bestSellerParentIds = new Set(bestSellers.map((c) => c.id));
  const discoveryPool = allCandidates.filter((c) => !bestSellerParentIds.has(c.id));
  const discovered = pickByCategoryDiversity(discoveryPool, 4);

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

      {/* ── 5. Best Sellers — featured first, randomized fill, max 8 cards ── */}
      {bestSellers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
          <div className="mb-8 flex items-baseline justify-between">
            <p className="upper-nav">Best Sellers</p>
            <Link
              href="/shop"
              className="text-[11px] uppercase tracking-[0.22em] text-stone-500 transition-colors hover:text-stone-900"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {bestSellers.map((product) => (
              <ProductCard key={product.variantId ?? product.id} product={product} />
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

      {/* ── 7. Handpicked — category-diverse discovery row, always 4 slots ── */}
      {allCandidates.length > 0 && (
        <section className="border-t border-stone-200 mx-auto max-w-7xl px-4 py-14 md:px-8">
          <div className="mb-8 flex items-baseline justify-between">
            <p className="upper-nav">Handpicked from Oaxaca</p>
            <Link
              href="/shop"
              className="text-[11px] uppercase tracking-[0.22em] text-stone-500 transition-colors hover:text-stone-900"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {discovered.map((product) => (
              <ProductCard key={product.variantId ?? product.id} product={product} />
            ))}
            {Array.from({ length: Math.max(0, 4 - discovered.length) }).map((_, i) => (
              <div key={`placeholder-${i}`} className="relative">
                <div className="relative aspect-[3/4] mb-3 bg-stone-50">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="select-none text-[10px] uppercase tracking-[0.28em] text-stone-300">
                      Coming Soon
                    </span>
                  </div>
                </div>
                <div className="h-[13px] w-24 bg-stone-100" />
                <div className="mt-2 h-[11px] w-14 bg-stone-100" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
