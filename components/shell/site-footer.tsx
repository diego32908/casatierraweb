import Link from "next/link";
import { Instagram } from "lucide-react";
import { BRAND_NAME, PICKUP_LOCATION_LABEL } from "@/lib/constants";

function splitAddress(addr: string): [string, string] {
  const parts = addr.split(", ");
  if (parts.length >= 3) {
    return [parts[0], parts.slice(1).join(", ")];
  }
  return [addr, ""];
}

export function SiteFooter() {
  const [street, cityState] = splitAddress(PICKUP_LOCATION_LABEL);

  return (
    <footer className="border-t border-stone-200 mt-10 py-14">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid md:grid-cols-4 gap-10 md:gap-8 pb-12 border-b border-stone-200">
          {/* Brand */}
          <div className="md:col-span-2">
            <p className="font-serif text-2xl tracking-[0.22em] text-stone-900 mb-4">
              {BRAND_NAME}
            </p>
            <p className="text-sm text-stone-500 leading-7 max-w-xs">
              A boutique curating handcrafted clothing, shoes, pottery, and cultural pieces rooted in Oaxacan tradition.
            </p>
            <div className="flex items-center gap-5 mt-6">
              <a
                href="https://instagram.com/artelati11"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-stone-600 hover:text-stone-900 transition-colors"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://tiktok.com/@oaxhouse"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="text-xs uppercase tracking-[0.18em] text-stone-600 hover:text-stone-900 transition-colors"
              >
                TikTok
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-stone-900 mb-5">Shop</p>
            <ul className="space-y-3 text-sm text-stone-500">
              <li>
                <Link href="/shop" className="hover:text-stone-900 transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/shop" className="hover:text-stone-900 transition-colors">
                  Shoes
                </Link>
              </li>
              <li>
                <Link href="/shop" className="hover:text-stone-900 transition-colors">
                  Apparel
                </Link>
              </li>
              <li>
                <Link href="/shop" className="hover:text-stone-900 transition-colors">
                  Home & Goods
                </Link>
              </li>
            </ul>
          </div>

          {/* Visit */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-stone-900 mb-5">Visit Us</p>
            <address className="not-italic text-sm text-stone-500 leading-7">
              <span className="block">{street}</span>
              {cityState && <span className="block">{cityState}</span>}
            </address>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(PICKUP_LOCATION_LABEL)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-xs uppercase tracking-[0.18em] text-stone-600 hover:text-stone-900 transition-colors"
            >
              Get Directions ↗
            </a>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-8 gap-4">
          <p className="text-xs text-stone-400">
            © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-stone-400">
            <Link href="/privacy" className="hover:text-stone-600 transition-colors">
              Privacy
            </Link>
            <Link href="/shipping" className="hover:text-stone-600 transition-colors">
              Shipping
            </Link>
            <Link href="/returns" className="hover:text-stone-600 transition-colors">
              Returns
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
