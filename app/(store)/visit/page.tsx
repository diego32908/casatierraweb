import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Visit Us — Tierra Oaxaca" };

const MAPS_QUERY = "1600+E+Holt+Ave+Ste+D24,+Pomona,+CA+91767";
const MAPS_DIR   = `https://www.google.com/maps/dir/?api=1&destination=${MAPS_QUERY}`;

const MAP_EMBED_SRC =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d831.3!2d-117.7637!3d34.0553!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80c331b5e7a3b1d1%3A0x5f1b2c3d4e5f6a7b!2s1600+E+Holt+Ave%2C+Pomona%2C+CA+91767!5e0!3m2!1sen!2sus!4v1700000000000!5m2!1sen!2sus";

const HOURS = [
  { day: "Monday",    hours: "10:00 am – 6:00 pm" },
  { day: "Tuesday",   hours: "Closed",             closed: true },
  { day: "Wednesday", hours: "10:00 am – 6:00 pm" },
  { day: "Thursday",  hours: "10:00 am – 6:00 pm" },
  { day: "Friday",    hours: "10:00 am – 6:00 pm" },
  { day: "Saturday",  hours: "10:00 am – 6:00 pm" },
  { day: "Sunday",    hours: "10:00 am – 6:00 pm" },
];

async function getVisitImage(): Promise<string | null> {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "visit_page")
      .single();
    return (data?.value as { image_url?: string | null })?.image_url ?? null;
  } catch {
    return null;
  }
}

export default async function VisitPage() {
  const imageUrl = await getVisitImage();

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "80px 32px",
      }}
    >
      {/* Two-column grid — 52/48, always side-by-side */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "52% 48%",
          gap: "72px",
          alignItems: "start",
        }}
      >

        {/* ── LEFT — image or warm placeholder ── */}
        <div
          style={{
            width: "100%",
            height: "560px",
            borderRadius: 2,
            overflow: "hidden",
            background: "#F4F4F4",
            flexShrink: 0,
          }}
        >
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Visit Tierra Oaxaca"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                display: "block",
              }}
            />
          )}
        </div>

        {/* ── RIGHT — info panel ── */}
        <div style={{ padding: "32px 24px 32px 8px" }}>

          <p className="text-[9px] uppercase tracking-[0.34em] text-stone-400 mb-8">
            Find Us
          </p>

          <div className="mb-6 space-y-1">
            <p className="font-serif text-[18px] text-stone-800 leading-[1.5]">
              Valley Indoor Swap Meet
            </p>
            <p className="font-serif text-[18px] text-stone-800 leading-[1.5]">
              Tierra Oaxaca
            </p>
            <p className="text-[13px] text-stone-400 leading-[1.75] pt-1">
              Suites D24 – D26
            </p>
            <p className="text-[13px] text-stone-500 leading-[1.75]">
              1600 E Holt Ave
            </p>
            <p className="text-[13px] text-stone-500 leading-[1.75]">
              Pomona, CA 91767
            </p>
          </div>

          {/* Small map — supporting element */}
          <a
            href={MAPS_DIR}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden"
            style={{ marginTop: 24, marginBottom: 12, borderRadius: 2 }}
            aria-label="Open directions in Google Maps"
          >
            <iframe
              src={MAP_EMBED_SRC}
              width="100%"
              height="150"
              style={{
                border: 0,
                display: "block",
                filter: "saturate(0.5) contrast(0.88) brightness(1.05)",
                pointerEvents: "none",
              }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Store location map"
            />
          </a>

          <a
            href={MAPS_DIR}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-[10px] uppercase tracking-[0.22em] text-stone-400 hover:text-stone-700 transition-colors duration-150"
          >
            Open in Google Maps →
          </a>

          <div className="border-t border-stone-100" style={{ margin: "36px 0" }} />

          <p className="text-[9px] uppercase tracking-[0.34em] text-stone-400 mb-6">
            Hours
          </p>

          <ul className="space-y-3">
            {HOURS.map(({ day, hours, closed }) => (
              <li key={day} className="flex justify-between gap-6 text-[12px]">
                <span className="text-stone-500">{day}</span>
                <span className={closed ? "text-stone-300 italic" : "text-stone-400"}>
                  {hours}
                </span>
              </li>
            ))}
          </ul>

        </div>
      </div>
    </div>
  );
}
