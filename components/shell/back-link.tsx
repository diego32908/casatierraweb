"use client";

import { useRouter } from "next/navigation";

interface Props {
  fallback?: string;
}

export function BackLink({ fallback = "/" }: Props) {
  const router = useRouter();

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }

  return (
    <a
      href={fallback}
      onClick={handleClick}
      className="group inline-flex cursor-pointer items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-stone-500 transition-colors duration-[150ms] hover:text-stone-900 active:opacity-50"
    >
      {/* Arrow — shifts left on hover */}
      <span className="inline-block transition-transform duration-[150ms] ease-out group-hover:-translate-x-0.5">
        ←
      </span>

      {/* Text with animated underline */}
      <span className="relative">
        Back
        <span
          aria-hidden
          className="absolute -bottom-px left-0 block h-px w-full origin-left scale-x-0 bg-stone-900 transition-transform duration-[150ms] ease-out group-hover:scale-x-100"
        />
      </span>
    </a>
  );
}
