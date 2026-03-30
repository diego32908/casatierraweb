"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ProductCard } from "@/components/product/product-card";
import type { ProductCardData } from "@/components/product/product-card";

const SUGGESTIONS = ["linen", "oaxaca", "ceramics", "dress", "pottery"];
const PANEL_WIDTH = 580;

interface PanelGeometry {
  top: number;
  width: number;
}

export function SearchPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [geo, setGeo] = useState<PanelGeometry>({ top: 0, width: PANEL_WIDTH });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductCardData[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<ProductCardData[]>([]);
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Tracks whether we've fetched the pre-open featured row — fetch only once per session
  const hasFetchedFeatured = useRef(false);
  const pathname = usePathname();

  // Client-only: needed for portal
  useEffect(() => { setMounted(true); }, []);

  function open() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const w = Math.min(PANEL_WIDTH, window.innerWidth - 32);
    setGeo({ top: rect.bottom + 12, width: w });
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
  }

  // Close on route change
  useEffect(() => { close(); }, [pathname]);

  // Focus input on open; clear state on close
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 40);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Fetch 3 featured products on first open — shown in the pre-query state
  useEffect(() => {
    if (!isOpen || hasFetchedFeatured.current) return;
    hasFetchedFeatured.current = true;
    supabaseBrowser
      .from("products")
      .select(
        "id, slug, name_en, base_price_cents, compare_at_price_cents, primary_image_url, variants:product_variants(color_name, color_hex)"
      )
      .eq("is_active", true)
      .eq("featured", true)
      .order("sort_order", { ascending: true })
      .limit(3)
      .then(({ data }) => {
        setFeaturedProducts((data ?? []) as ProductCardData[]);
      });
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // Debounced search — name_en + search_keywords — max 6 results
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const safe = query.trim().replace(/[%_\\]/g, "");
    if (!safe) return;
    const t = setTimeout(async () => {
      const { data } = await supabaseBrowser
        .from("products")
        .select(
          "id, slug, name_en, base_price_cents, compare_at_price_cents, primary_image_url, variants:product_variants(color_name, color_hex)"
        )
        .eq("is_active", true)
        .or(`name_en.ilike.%${safe}%,search_keywords.ilike.%${safe}%`)
        .limit(6);
      setResults((data ?? []) as ProductCardData[]);
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  const portal = mounted && isOpen ? createPortal(
    <>
      {/* Dim backdrop — click outside to close */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999,
          backgroundColor: "rgba(33,28,24,0.07)",
        }}
        onClick={close}
      />

      {/* Search surface — right-anchored, below header */}
      <div
        style={{
          position: "fixed",
          top: geo.top,
          right: 16,
          width: geo.width,
          maxHeight: `calc(100vh - ${geo.top + 20}px)`,
          overflowY: "auto",
          zIndex: 1000,
          // Warm cream surface — slightly elevated above page background
          backgroundColor: "#FFFFFF",
          border: "1px solid #EAEAEA",
          boxShadow:
            "0 40px 100px -20px rgba(33,28,24,0.22), 0 12px 32px -6px rgba(33,28,24,0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Input row ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "26px 32px 22px",
            borderBottom: "1px solid #EAEAEA",
          }}
        >
          <Search
            style={{ width: 16, height: 16, flexShrink: 0, color: "#78716C" }}
            strokeWidth={1.3}
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 15,
              lineHeight: 1.4,
              color: "#211C18",
              fontFamily: "inherit",
              letterSpacing: "0.01em",
            }}
          />
          <button
            onClick={close}
            aria-label="Close search"
            style={{
              flexShrink: 0,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "5px",
              lineHeight: 0,
              color: "#A8A29E",
              transition: "color 150ms",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#57534E"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#A8A29E"; }}
          >
            <X style={{ width: 15, height: 15 }} strokeWidth={1.4} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: "28px 32px 36px" }}>

          {/* Suggested terms */}
          {!query.trim() && (
            <div>
              <p
                style={{
                  fontSize: 9,
                  textTransform: "uppercase",
                  letterSpacing: "0.24em",
                  color: "#A8A29E",
                  marginBottom: 14,
                }}
              >
                Suggested
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    style={{
                      border: "1px solid #D6D0C8",
                      padding: "7px 16px",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.16em",
                      color: "#78716C",
                      background: "transparent",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "border-color 150ms, color 150ms",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "#78716C";
                      (e.currentTarget as HTMLButtonElement).style.color = "#211C18";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "#D6D0C8";
                      (e.currentTarget as HTMLButtonElement).style.color = "#78716C";
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Featured products — 1 row of 3, visible before typing */}
          {!query.trim() && featuredProducts.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <p
                style={{
                  fontSize: 9,
                  textTransform: "uppercase",
                  letterSpacing: "0.24em",
                  color: "#A8A29E",
                  marginBottom: 20,
                }}
              >
                From the Collection
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  columnGap: 16,
                  rowGap: 0,
                }}
              >
                {featuredProducts.slice(0, 3).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}

          {/* Product results — 3 columns, up to 2 rows = 6 max */}
          {results.length > 0 && (
            <div>
              <p
                style={{
                  fontSize: 9,
                  textTransform: "uppercase",
                  letterSpacing: "0.24em",
                  color: "#A8A29E",
                  marginBottom: 20,
                }}
              >
                Results
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  columnGap: 16,
                  rowGap: 24,
                }}
              >
                {results.slice(0, 6).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {query.trim() && results.length === 0 && (
            <p style={{ fontSize: 13, color: "#A8A29E", letterSpacing: "0.01em" }}>
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

        </div>
      </div>
    </>,
    document.body
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        aria-label="Search"
        onClick={open}
        className="transition-colors duration-150 hover:text-ink"
        style={{ lineHeight: 0 }}
      >
        <Search className="h-[17px] w-[17px]" strokeWidth={1.2} />
      </button>
      {portal}
    </>
  );
}
