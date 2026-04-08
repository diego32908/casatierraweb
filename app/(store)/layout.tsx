import { SiteHeader } from "@/components/shell/site-header";
import { SiteFooter } from "@/components/shell/site-footer";
import { SignupPopup } from "@/components/popups/signup-popup";
import { WishlistProvider } from "@/components/wishlist/wishlist-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getPopupConfig() {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "popup")
      .single();
    return data?.value as {
      enabled?: boolean;
      promo_enabled?: boolean;
      heading?: string | null;
      body_copy?: string | null;
      discount_text?: string | null;
      promo_code?: string | null;
      cta_label?: string | null;
      fine_print?: string | null;
      image_url?: string | null;
      layout?: "split" | "centered";
      delay_seconds?: number;
      scroll_trigger_percent?: number;
    } | null;
  } catch {
    return null;
  }
}

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const popup = await getPopupConfig();
  const popupEnabled = popup?.enabled === true;

  return (
    <WishlistProvider>
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      {popupEnabled && (
        <SignupPopup
          heading={popup?.heading ?? "Join the Community"}
          bodyCopy={popup?.body_copy ?? null}
          discountText={popup?.discount_text ?? null}
          promoCode={popup?.promo_enabled !== false ? (popup?.promo_code ?? null) : null}
          promoEnabled={popup?.promo_enabled !== false}
          ctaLabel={popup?.cta_label ?? "Claim Offer"}
          finePrint={popup?.fine_print ?? "No spam. Unsubscribe anytime."}
          imageUrl={popup?.image_url ?? null}
          layout={popup?.layout ?? "centered"}
          delaySeconds={popup?.delay_seconds ?? 7}
          scrollTriggerPercent={popup?.scroll_trigger_percent ?? 40}
        />
      )}
    </div>
    </WishlistProvider>
  );
}
