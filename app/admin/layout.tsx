"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminGuard } from "@/components/admin/admin-guard";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";

const adminNav = [
  { href: "/admin/inventory",   label: "Inventory" },
  { href: "/admin/orders",      label: "Orders" },
  { href: "/admin/returns",     label: "Returns" },
  { href: "/admin/waitlist",       label: "Waitlist" },
  { href: "/admin/cart-interests", label: "Cart Demand" },
  { href: "/admin/customers",      label: "Customers" },
  { href: "/admin/profiles",       label: "Profiles" },
  { href: "/admin/leads",       label: "Leads" },
  { href: "/admin/subscribers", label: "Subscribers" },
  { href: "/admin/content",     label: "Content" },
  { href: "/admin/security",    label: "Security" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Login page gets a bare full-screen wrapper — no sidebar, no guard
  if (pathname === "/admin/login") {
    return <div className="min-h-screen bg-stone-50">{children}</div>;
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-stone-50">
        <div className="mx-auto grid min-h-screen max-w-7xl md:grid-cols-[220px_1fr]">
          <aside className="border-r border-stone-300 p-6">
            <div className="mb-8 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                Admin
              </p>
              <AdminLogoutButton />
            </div>
            <nav className="space-y-3">
              {adminNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-sm text-stone-700 hover:bg-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          <main className="p-6 md:p-10">{children}</main>
        </div>
      </div>
    </AdminGuard>
  );
}
