"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getWishlistIds, toggleWishlistId } from "@/lib/wishlist";

interface WishlistCtx {
  ids: string[];
  hydrated: boolean;  // true once localStorage has been read
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  count: number;
}

const WishlistContext = createContext<WishlistCtx>({
  ids: [],
  hydrated: false,
  toggle: () => {},
  has: () => false,
  count: 0,
});

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Read from localStorage after first client render — avoids SSR mismatch
  useEffect(() => {
    setIds(getWishlistIds());
    setHydrated(true);
  }, []);

  function toggle(id: string) {
    setIds(toggleWishlistId(id));
  }

  return (
    <WishlistContext.Provider
      value={{ ids, hydrated, toggle, has: (id) => ids.includes(id), count: ids.length }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
