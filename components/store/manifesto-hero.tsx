import Link from "next/link";

export interface ManifestoHeroProps {
  imageUrl: string | null;
  eyebrow: string;
  heading: string;
  body: string | null;
  ctaLabel: string;
  ctaUrl: string;
}

/**
 * Split editorial hero — dominant image left, restrained manifesto panel right.
 * Used as the homepage opening section.
 *
 * All copy props are passed from the parent so content is easy to revise
 * from a single location (page.tsx defaults or CMS/site_settings).
 */
export function ManifestoHero({
  imageUrl,
  eyebrow,
  heading,
  body,
  ctaLabel,
  ctaUrl,
}: ManifestoHeroProps) {
  return (
    <section aria-label="Brand introduction">
      <div className="grid md:grid-cols-[1.45fr_0.55fr] min-h-[86vh] border-b border-divide">

        {/* Left — editorial image, full bleed */}
        <div className="relative overflow-hidden bg-bone-panel">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              role="presentation"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center eyebrow text-stone-300">
              Editorial Image
            </div>
          )}
        </div>

        {/* Right — manifesto panel */}
        <div className="flex flex-col justify-center border-t border-divide bg-bone px-12 py-16 md:border-l md:border-t-0">

          {/* Eyebrow — location / coordinates */}
          <p className="eyebrow mb-8">{eyebrow}</p>

          {/* Serif headline */}
          <h1 className="font-serif text-[2.1rem] leading-[1.2] tracking-[-0.01em] text-ink mb-6">
            {heading}
          </h1>

          {/* Manifesto body — constrained like a gallery note */}
          {body && (
            <p className="text-[13px] leading-relaxed text-stone-500 max-w-[280px] mb-10">
              {body}
            </p>
          )}

          {/* Restrained CTA — text link, not button */}
          <Link
            href={ctaUrl}
            className="group inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-stone-500 transition-colors duration-150 hover:text-ink"
          >
            {ctaLabel}
            <span
              aria-hidden
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>

        </div>
      </div>
    </section>
  );
}
