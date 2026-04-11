"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from "react";
import {
  type CartItem,
  cartKey,
  cartSubtotalCents,
  cartTotalItems,
  loadCart,
  saveCart,
} from "@/lib/cart";
import { trackCartInterest } from "@/app/actions/cart-interests";

// ── Reducer ───────────────────────────────────────────────────────────────────

type CartAction =
  | { type: "INIT"; items: CartItem[] }
  | { type: "ADD"; item: Omit<CartItem, "key" | "quantity"> }
  | { type: "REMOVE"; key: string }
  | { type: "SET_QTY"; key: string; qty: number }
  | { type: "CLEAR" };

function reducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "INIT":
      return action.items;

    case "ADD": {
      const key = cartKey(action.item.product_id, action.item.variant_id);
      const existing = items.find((i) => i.key === key);
      if (existing) {
        return items.map((i) =>
          i.key === key ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...items, { ...action.item, key, quantity: 1 }];
    }

    case "REMOVE":
      return items.filter((i) => i.key !== action.key);

    case "SET_QTY":
      if (action.qty <= 0) return items.filter((i) => i.key !== action.key);
      return items.map((i) =>
        i.key === action.key ? { ...i, quantity: action.qty } : i
      );

    case "CLEAR":
      return [];

    default:
      return items;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  subtotalCents: number;
  addItem: (item: Omit<CartItem, "key" | "quantity">) => void;
  removeItem: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, dispatch] = useReducer(reducer, []);

  // Hydrate from localStorage once mounted (avoids SSR mismatch)
  useEffect(() => {
    dispatch({ type: "INIT", items: loadCart() });
  }, []);

  // Persist on every change
  useEffect(() => {
    saveCart(items);
  }, [items]);

  const addItem = useCallback(
    (item: Omit<CartItem, "key" | "quantity">) => {
      dispatch({ type: "ADD", item });
      // Fire-and-forget demand tracking — failure must never affect cart UX
      void trackCartInterest(
        item.product_id,
        item.variant_id ?? null,
        item.product_name,
        [item.selected_color_name, item.selected_size].filter(Boolean).join(" · ") || null
      );
    },
    []
  );
  const removeItem = useCallback(
    (key: string) => dispatch({ type: "REMOVE", key }),
    []
  );
  const setQty = useCallback(
    (key: string, qty: number) => dispatch({ type: "SET_QTY", key, qty }),
    []
  );
  const clearCart = useCallback(() => dispatch({ type: "CLEAR" }), []);

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems: cartTotalItems(items),
        subtotalCents: cartSubtotalCents(items),
        addItem,
        removeItem,
        setQty,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
