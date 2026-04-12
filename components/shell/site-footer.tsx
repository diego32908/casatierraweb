import Link from "next/link";
import { BRAND_NAME } from "@/lib/constants";
import { FooterNewsletter } from "./footer-newsletter";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const SUPPORT_LINKS = [
  { label: "Contact Us",         href: "/contact" },
  { label: "Custom Requests",    href: "/contact?type=custom" },
  { label: "Bulk Orders",        href: "/contact?type=bulk" },
  { label: "Shipping & Returns", href: "/shipping" },
  { label: "Track Order",        href: "/track-order" },
  { label: "Returns & Exchanges", href: "/returns" },
  { label: "Visit Us",           href: "/visit" },
];


const FALLBACK_SOCIAL_URLS = {
  instagram: "https://www.instagram.com/yolotl_artemexicano?igsh=NTc4MTIwNjQ2YQ==",
  tiktok:    "https://www.tiktok.com/@yolotlarte?_r=1&_t=ZT-953J02agR1q",
  etsy:      "https://www.etsy.com/shop/elzapatiadofolklor/?etsrc=sdt",
};

async function getSocialUrls() {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "social_links")
      .single();
    const v = (data?.value ?? {}) as {
      instagram_url?: string | null;
      tiktok_url?:    string | null;
      etsy_url?:      string | null;
    };
    return {
      instagram: v.instagram_url || FALLBACK_SOCIAL_URLS.instagram,
      tiktok:    v.tiktok_url    || FALLBACK_SOCIAL_URLS.tiktok,
      etsy:      v.etsy_url      || FALLBACK_SOCIAL_URLS.etsy,
    };
  } catch {
    return FALLBACK_SOCIAL_URLS;
  }
}

export async function SiteFooter() {
  const socialUrls = await getSocialUrls();

  return (
    <footer className="w-full border-t border-[#EAEAEA]">

      <div className="px-4 py-12 md:px-12 lg:px-20 xl:px-28">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 lg:gap-x-20 gap-y-12">

          {/* LEFT — Brand */}
          <div>
            <p
              className="font-serif text-stone-900 leading-none"
              style={{ fontSize: 28, letterSpacing: "0.01em" }}
            >
              {BRAND_NAME}
            </p>

            <p
              className="text-stone-400 leading-[1.9]"
              style={{ fontSize: 13, marginTop: 20 }}
            >
              Craft rooted in Oaxaca.<br />
              Made by artisans, not factories.
            </p>

            <div style={{ marginTop: 40 }} className="space-y-3">
              {[
                { label: "Instagram", href: socialUrls.instagram },
                { label: "TikTok",    href: socialUrls.tiktok },
                { label: "Etsy",      href: socialUrls.etsy },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-fit text-[13px] text-stone-400 hover:text-stone-800 transition-colors duration-150 group"
                >
                  <span>{label}</span>
                  <span className="text-stone-300 group-hover:text-stone-600 transition-colors duration-150" aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </div>

          {/* MIDDLE — Support */}
          <div>
            <p className="text-[11px] uppercase tracking-widest text-stone-500 mb-6">
              Support
            </p>
            <ul className="space-y-4">
              {SUPPORT_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-[13px] text-stone-500 hover:text-stone-900 transition-colors duration-150"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* RIGHT — Newsletter + shipping note */}
          <div>
            <FooterNewsletter />
            <p className="mt-5 text-[11px] text-stone-400 leading-relaxed">
              Free standard shipping on US orders $150+.<br />
              Does not apply to heavy or fragile items.
            </p>
          </div>

        </div>
      </div>

      {/* BOTTOM SECTION */}
      <div className="w-full px-6 md:px-10 lg:px-16 xl:px-24 2xl:px-32 pt-6 pb-8 border-t border-[#EAEAEA]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <p className="text-[11px] text-stone-400">
            © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
          </p>
          <div className="flex gap-6 text-[11px] text-stone-400">
            <Link href="/privacy"  className="hover:text-stone-700 transition-colors duration-150">Privacy</Link>
            <Link href="/shipping" className="hover:text-stone-700 transition-colors duration-150">Shipping</Link>
            <Link href="/returns"  className="hover:text-stone-700 transition-colors duration-150">Returns</Link>
          </div>
        </div>
      </div>

    </footer>
  );
}
