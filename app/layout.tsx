import "./globals.css";
import type { Metadata } from "next";
import { BRAND_NAME } from "@/lib/constants";
import { CartProvider } from "@/components/cart/cart-context";

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: "Boutique artisan storefront for clothing, shoes, pottery, and cultural pieces.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900 antialiased">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
