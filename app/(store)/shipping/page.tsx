import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping Policy — Tierra Oaxaca",
};

export default function ShippingPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 md:px-8 py-16 md:py-24">
      <header className="mb-12">
        <p className="text-[11px] uppercase tracking-[0.22em] text-stone-400 mb-3">Legal</p>
        <h1 className="font-serif text-3xl text-stone-900">Shipping Policy</h1>
        <p className="mt-3 text-sm text-stone-400">Last updated: April 2025</p>
      </header>

      <div className="space-y-10 text-sm leading-7 text-stone-600">

        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-3">Domestic Shipping (United States)</h2>
          <p className="mb-3">We currently ship within the United States only.</p>
          <ul className="list-disc list-inside space-y-1.5 text-stone-500 pl-1">
            <li>Free standard shipping on orders over $150</li>
            <li>Standard shipping: 5–8 business days</li>
            <li>Expedited shipping options are available at checkout</li>
          </ul>
          <p className="mt-3">
            Free shipping does not apply to heavy, oversized, or fragile items such as pottery and
            large home décor pieces. Shipping costs for these items will be calculated at checkout.
          </p>
        </section>

        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-3">Order Processing</h2>
          <p>
            Orders are processed within 1–3 business days. You will receive a confirmation email
            once your order is placed, and a separate notification with tracking information once
            your order ships.
          </p>
          <p className="mt-3">
            Orders placed on weekends or holidays will begin processing on the next business day.
          </p>
        </section>

        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-3">Tracking Your Order</h2>
          <p>
            Once your order ships, you will receive a tracking number by email. You can also track
            your order at any time using our{" "}
            <a href="/track-order" className="underline underline-offset-2 hover:text-stone-900 transition-colors">
              order tracking page
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-3">Local Pickup</h2>
          <p>
            Prefer to pick up in person? We offer free local pickup at our location in Pomona, CA.
            Select &ldquo;Pickup&rdquo; at checkout and we will contact you when your order is ready.
          </p>
          <p className="mt-3 text-stone-500">
            1600 E Holt Ave, Ste D24–D26, Pomona, CA 91767
          </p>
        </section>

        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-3">Damaged or Lost Packages</h2>
          <p>
            If your package arrives damaged or is lost in transit, please contact us within 7 days
            of the expected delivery date. We will work with the carrier to resolve the issue and
            make it right.
          </p>
          <p className="mt-3">
            Reach us through our{" "}
            <a href="/contact" className="underline underline-offset-2 hover:text-stone-900 transition-colors">
              contact page
            </a>
            {" "}with your order number and a description of the issue.
          </p>
        </section>

        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-3">Questions</h2>
          <p>
            For any shipping-related questions, please{" "}
            <a href="/contact" className="underline underline-offset-2 hover:text-stone-900 transition-colors">
              contact us
            </a>
            {" "}and we will be happy to help.
          </p>
        </section>

      </div>
    </div>
  );
}
