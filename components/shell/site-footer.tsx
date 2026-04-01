import Link from "next/link";
import { Instagram } from "lucide-react";
import { BRAND_NAME } from "@/lib/constants";
import { FooterNewsletter } from "./footer-newsletter";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const SUPPORT_LINKS = [
  { label: "Contact Us",         href: "/contact" },
  { label: "Custom Requests",    href: "/contact?type=custom" },
  { label: "Bulk Orders",        href: "/contact?type=bulk" },
  { label: "Shipping & Returns", href: "/shipping" },
  { label: "Visit Us",           href: "/visit" },
];

const TikTokIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.16 8.16 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1-.07z" />
  </svg>
);

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
    <footer className="w-full mt-24 border-t border-[#EAEAEA]">

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

            <div style={{ marginTop: 40 }}>
              <p className="text-[11px] uppercase tracking-widest text-stone-500 mb-4">
                Socials
              </p>
              <div className="flex items-center gap-6">
                <a
                  href={socialUrls.instagram}
                  target="_blank" rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="text-stone-400 hover:text-stone-800 transition-colors duration-150"
                >
                  <Instagram className="h-[22px] w-[22px]" strokeWidth={1.3} />
                </a>
                <a
                  href={socialUrls.tiktok}
                  target="_blank" rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="text-stone-400 hover:text-stone-800 transition-colors duration-150"
                >
                  <TikTokIcon />
                </a>
                <a
                  href={socialUrls.etsy}
                  target="_blank" rel="noopener noreferrer"
                  aria-label="Etsy Shop"
                  className="text-[12px] uppercase tracking-widest text-stone-400 hover:text-stone-800 transition-colors duration-150"
                >
                  Etsy
                </a>
              </div>
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

          {/* RIGHT — Newsletter */}
          <FooterNewsletter />

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
