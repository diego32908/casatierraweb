import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Tierra Oaxaca",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 md:px-8 py-16 md:py-24">
      <header className="mb-12">
        <p className="text-[11px] uppercase tracking-[0.22em] text-stone-400 mb-3">Legal</p>
        <h1 className="font-serif text-3xl text-stone-900">Privacy Policy</h1>
        <p className="mt-3 text-sm text-stone-400">Last updated: April 2025</p>
      </header>

      <div className="space-y-10 text-sm leading-7 text-stone-600">

        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-3">Overview</h2>
          <p>
            Tierra Oaxaca is committed to protecting your personal information. This policy explains what
            we collect, how we use it, and the choices you have. By using our site or placing an order,
            you agree to the practices described here.
          </p>
        </section>

        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-3">Information We Collect</h2>
          <p className="mb-3">We collect information you provide directly:</p>
          <ul className="list-disc list-inside space-y-1.5 text-stone-500 pl-1">
            <li>Name, email address, phone number</li>
            <li>Shipping address for order fulfillment</li>
            <li>Order history and purchase details</li>
            <li>Messages sent through our contact or custom request forms</li>
            <li>Newsletter and waitlist subscriptions</li>
          </ul>
          <p className="mt-3">
            We do not store payment card information. All payments are processed securely through
            Stripe, which is PCI-compliant.
          </p>
        </section>

        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-3">How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-1.5 text-stone-500 pl-1">
            <li>To process and fulfill your orders</li>
            <li>To send order confirmation and shipping notifications</li>
            <li>To respond to customer service inquiries</li>
            <li>To send marketing emails if you have opted in (you can unsubscribe at any time)</li>
            <li>To improve our website and shopping experience</li>
          </ul>
          <p className="mt-3">We do not sell your personal information to third parties.</p>
        </section>

        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-3">Third-Party Services</h2>
          <p>
            We use trusted third-party services to operate our store. These may include Stripe
            (payment processing), Supabase (data storage), and email delivery providers. Each
            operates under their own privacy policy and we only share the minimum data necessary
            to provide the service.
          </p>
        </section>

        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-3">Cookies & Analytics</h2>
          <p>
            Our site may use cookies and similar technologies to remember your cart and preferences.
            We do not use invasive tracking or sell browsing data. You can disable cookies in your
            browser settings, though some features of the site may not work correctly without them.
          </p>
        </section>

        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-3">Your Rights</h2>
          <p>
            You may request access to, correction of, or deletion of your personal data at any time
            by contacting us at{" "}
            <a href="/contact" className="underline underline-offset-2 hover:text-stone-900 transition-colors">
              our contact page
            </a>
            . We will respond within a reasonable time.
          </p>
        </section>

        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-3">Data Retention</h2>
          <p>
            We retain order and customer data as long as necessary to fulfill orders, comply with
            legal obligations, and resolve disputes. You may request deletion of your account data
            at any time, subject to legal record-keeping requirements.
          </p>
        </section>

        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-3">Contact</h2>
          <p>
            If you have questions about this policy or your personal information, please reach out
            through our{" "}
            <a href="/contact" className="underline underline-offset-2 hover:text-stone-900 transition-colors">
              contact page
            </a>
            .
          </p>
        </section>

      </div>
    </div>
  );
}
