import Link from "next/link";
import { AdminGuard } from "@/components/admin/admin-guard";

const adminNav = [
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/content", label: "Content" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-stone-50">
        <div className="mx-auto grid min-h-screen max-w-7xl md:grid-cols-[220px_1fr]">
          <aside className="border-r border-stone-300 p-6">
            <p className="mb-8 text-xs uppercase tracking-[0.22em] text-stone-500">
              Admin
            </p>
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
