"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND_NAME } from "@/lib/constants";

export function LogoLink() {
  const pathname = usePathname();

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <Link
      href="/"
      onClick={handleClick}
      className="font-serif text-[27px] tracking-[0.22em] text-ink transition-opacity duration-150 hover:opacity-75"
    >
      {BRAND_NAME}
    </Link>
  );
}
