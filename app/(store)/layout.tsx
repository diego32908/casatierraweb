import { SiteHeader } from "@/components/shell/site-header";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>{children}</main>
    </div>
  );
}
