"use client";

import Link from "next/link";
import { User } from "lucide-react";

// Links to /account — the account page handles redirect to login if not authenticated.
// Kept as a client component for consistency with the other header icon buttons.
export function ProfileHeaderButton() {
  return (
    <Link
      href="/account"
      aria-label="Account"
      style={{ lineHeight: 0 }}
    >
      <User
        strokeWidth={1.25}
        style={{
          width: 18,
          height: 18,
          display: "block",
        }}
      />
    </Link>
  );
}
