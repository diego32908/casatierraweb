import { createServerSupabaseClient } from "@/lib/supabase/server";
import { HeroEditor } from "./hero-editor";
import { EditorialEditor } from "./editorial-editor";
import { CategoryCardsEditor } from "./category-cards-editor";
import { PopupEditor } from "./popup-editor";
import { AnnouncementEditor } from "./announcement-editor";
import { VisitImageEditor } from "./visit-image-editor";
import { SocialLinksEditor } from "./social-links-editor";
import { ShippingEditor } from "./shipping-editor";

type CardData = {
  key: string;
  label: string;
  hint: string;
  image_url: string | null;
};

// Fallback card definitions — used if the DB row doesn't exist yet
const DEFAULT_CARDS: CardData[] = [
  { key: "shoes",   label: "Shoes",        hint: "Footwear",        image_url: null },
  { key: "apparel", label: "Apparel",      hint: "Clothing",        image_url: null },
  { key: "home",    label: "Home & Goods", hint: "Pottery & Décor", image_url: null },
];

async function getSiteSettings() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.from("site_settings").select("key, value");
  if (!data) return {};
  return Object.fromEntries(data.map((row) => [row.key, row.value]));
}

export default async function AdminContentPage() {
  const settings = await getSiteSettings();

  const hero = (settings["hero"] ?? {}) as {
    image_url?: string | null;
    heading?: string | null;
    subheading?: string | null;
    cta_label?: string | null;
    cta_url?: string | null;
  };

  const editorial = (settings["editorial_break"] ?? {}) as {
    image_url?: string | null;
  };

  const categoryCardsValue = settings["category_cards"] as
    | { cards?: CardData[] }
    | undefined;
  const categoryCards: CardData[] = categoryCardsValue?.cards ?? DEFAULT_CARDS;

  const popup = (settings["popup"] ?? {}) as {
    image_url?: string | null;
    enabled?: boolean;
    heading?: string | null;
    body_copy?: string | null;
    discount_text?: string | null;
    promo_code?: string | null;
    cta_label?: string | null;
    fine_print?: string | null;
    layout?: "split" | "centered";
  };

  const announcement = (settings["announcement_bar"] ?? {}) as {
    enabled?: boolean;
    text?: string;
    url?: string | null;
  };

  const visitPage = (settings["visit_page"] ?? {}) as {
    image_url?: string | null;
  };

  const socialLinks = (settings["social_links"] ?? {}) as {
    instagram_url?: string | null;
    tiktok_url?:    string | null;
    etsy_url?:      string | null;
  };

  const shipping = (settings["shipping"] ?? {}) as {
    flat_rate_cents?: number;
    priority_rate_cents?: number;
    free_threshold_cents?: number;
  };

  return (
    <section className="max-w-2xl space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Site Content</h1>
        <p className="mt-2 text-sm text-stone-500">
          Manage homepage images and copy. Changes go live immediately.
        </p>
      </header>

      <ShippingEditor
        flatRateCents={shipping.flat_rate_cents ?? 899}
        priorityRateCents={shipping.priority_rate_cents ?? 1599}
        freeThresholdCents={shipping.free_threshold_cents ?? 15000}
      />

      <AnnouncementEditor
        enabled={announcement.enabled ?? false}
        text={announcement.text ?? ""}
        url={announcement.url ?? null}
      />

      <HeroEditor
        imageUrl={hero.image_url ?? null}
        heading={hero.heading ?? ""}
        subheading={hero.subheading ?? ""}
        ctaLabel={hero.cta_label ?? "Shop Now"}
        ctaUrl={hero.cta_url ?? "/shop"}
      />

      <EditorialEditor imageUrl={editorial.image_url ?? null} />

      <CategoryCardsEditor cards={categoryCards} />

      <PopupEditor
        imageUrl={popup.image_url ?? null}
        enabled={popup.enabled ?? false}
        heading={popup.heading ?? ""}
        bodyCopy={popup.body_copy ?? ""}
        discountText={popup.discount_text ?? ""}
        promoCode={popup.promo_code ?? ""}
        ctaLabel={popup.cta_label ?? "Claim Offer"}
        finePrint={popup.fine_print ?? "No spam. Unsubscribe anytime."}
        layout={popup.layout ?? "centered"}
      />

      <VisitImageEditor imageUrl={visitPage.image_url ?? null} />

      <SocialLinksEditor
        instagramUrl={socialLinks.instagram_url ?? "https://www.instagram.com/yolotl_artemexicano?igsh=NTc4MTIwNjQ2YQ=="}
        tiktokUrl={socialLinks.tiktok_url       ?? "https://www.tiktok.com/@yolotlarte?_r=1&_t=ZT-953J02agR1q"}
        etsyUrl={socialLinks.etsy_url           ?? "https://www.etsy.com/shop/elzapatiadofolklor/?etsrc=sdt"}
      />
    </section>
  );
}
