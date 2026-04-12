"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { getMyOrders } from "@/app/actions/account-orders";
import { formatPrice } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

type ShippingAddress = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

type Profile = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  birthday: string | null;
  gender: string | null;
  default_shipping_address: ShippingAddress | null;
};

type OrderItem = {
  id: string;
  product_name_snapshot: string;
  variant_label_snapshot: string | null;
  quantity: number;
  line_total_cents: number;
};

type Order = {
  id: string;
  created_at: string;
  status: string;
  total_cents: number;
  fulfillment: string;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
  order_items: OrderItem[];
};

const inputCls =
  "w-full border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-stone-400 transition-colors";
const labelCls = "block text-[11px] uppercase tracking-[0.16em] text-stone-500 mb-1.5";

const STATUS_LABELS: Record<string, string> = {
  PAID:              "Paid",
  PREPARING:         "Preparing",
  SHIPPED:           "Shipped",
  READY_FOR_PICKUP:  "Ready for Pickup",
  COMPLETED:         "Completed",
  CANCELLED:         "Cancelled",
};

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    birthday: "",
    gender: "",
    addr_line1: "",
    addr_line2: "",
    addr_city: "",
    addr_state: "",
    addr_postal_code: "",
    addr_country: "",
  });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        router.replace("/auth/login?next=/account");
        return;
      }

      setUser(session.user);

      // Load profile
      const { data: profileData } = await supabaseBrowser
        .from("profiles")
        .select("id, email, first_name, last_name, phone, birthday, gender, default_shipping_address")
        .eq("id", session.user.id)
        .single();

      if (profileData) {
        const p = profileData as Profile;
        setProfile(p);
        const addr = p.default_shipping_address;
        setEditForm({
          first_name:       p.first_name ?? "",
          last_name:        p.last_name ?? "",
          phone:            p.phone ?? "",
          birthday:         p.birthday ?? "",
          gender:           p.gender ?? "",
          addr_line1:       addr?.line1 ?? "",
          addr_line2:       addr?.line2 ?? "",
          addr_city:        addr?.city ?? "",
          addr_state:       addr?.state ?? "",
          addr_postal_code: addr?.postal_code ?? "",
          addr_country:     addr?.country ?? "",
        });
      }

      // Load orders via server action — auth verified server-side, explicit email
      // filter applied at the application layer (not solely dependent on RLS).
      const ordersData = await getMyOrders();
      setOrders(ordersData as Order[]);
      setLoading(false);
    })();
  }, [router]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaveError(null);

    const hasAddr = !!(editForm.addr_line1.trim() || editForm.addr_city.trim());
    const shippingAddr: ShippingAddress | null = hasAddr
      ? {
          line1:       editForm.addr_line1.trim(),
          line2:       editForm.addr_line2.trim(),
          city:        editForm.addr_city.trim(),
          state:       editForm.addr_state.trim(),
          postal_code: editForm.addr_postal_code.trim(),
          country:     editForm.addr_country.trim() || "US",
        }
      : null;

    const { error } = await supabaseBrowser.from("profiles").upsert({
      id:                       user.id,
      email:                    user.email ?? "",
      first_name:               editForm.first_name.trim() || null,
      last_name:                editForm.last_name.trim()  || null,
      phone:                    editForm.phone.trim()      || null,
      birthday:                 editForm.birthday          || null,
      gender:                   editForm.gender            || null,
      default_shipping_address: shippingAddr,
    });

    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }

    setProfile((prev) => prev ? {
      ...prev,
      first_name:               editForm.first_name.trim() || null,
      last_name:                editForm.last_name.trim()  || null,
      phone:                    editForm.phone.trim()      || null,
      birthday:                 editForm.birthday          || null,
      gender:                   editForm.gender            || null,
      default_shipping_address: shippingAddr,
    } : prev);
    setEditing(false);
  }

  async function handleSignOut() {
    await supabaseBrowser.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-xs uppercase tracking-widest text-stone-400">Loading…</p>
      </div>
    );
  }

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || user?.email;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-8">

      {/* Header */}
      <div className="mb-12 flex items-baseline justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-stone-400 mb-1">Account</p>
          <h1 className="text-xl font-medium text-stone-900">{displayName}</h1>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="text-xs uppercase tracking-wide text-stone-400 hover:text-stone-700 transition-colors"
        >
          Sign out
        </button>
      </div>

      <div className="space-y-12">

        {/* ── Profile ── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <p className="text-[10px] uppercase tracking-[0.22em] text-stone-400">Profile</p>
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs uppercase tracking-wide text-stone-400 hover:text-stone-700 transition-colors"
              >
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSaveProfile} className="space-y-4 max-w-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>First name</label>
                  <input
                    className={inputCls}
                    value={editForm.first_name}
                    onChange={(e) => setEditForm((p) => ({ ...p, first_name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Last name</label>
                  <input
                    className={inputCls}
                    value={editForm.last_name}
                    onChange={(e) => setEditForm((p) => ({ ...p, last_name: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Phone <span className="normal-case text-stone-400">(optional)</span></label>
                <input
                  type="tel"
                  className={inputCls}
                  value={editForm.phone}
                  onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelCls}>Birthday <span className="normal-case text-stone-400">(optional)</span></label>
                <input
                  type="date"
                  className={inputCls}
                  value={editForm.birthday}
                  onChange={(e) => setEditForm((p) => ({ ...p, birthday: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelCls}>Gender <span className="normal-case text-stone-400">(optional)</span></label>
                <select
                  className={inputCls}
                  value={editForm.gender}
                  onChange={(e) => setEditForm((p) => ({ ...p, gender: e.target.value }))}
                >
                  <option value="">Prefer not to say</option>
                  <option value="woman">Woman</option>
                  <option value="man">Man</option>
                  <option value="non_binary">Non-binary</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>

              {/* Default shipping address */}
              <div className="pt-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-3">Default shipping address <span className="normal-case text-stone-400">(optional)</span></p>
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Address line 1</label>
                    <input className={inputCls} value={editForm.addr_line1} onChange={(e) => setEditForm((p) => ({ ...p, addr_line1: e.target.value }))} placeholder="123 Main St" autoComplete="address-line1" />
                  </div>
                  <div>
                    <label className={labelCls}>Address line 2 <span className="normal-case text-stone-400">(apt, suite…)</span></label>
                    <input className={inputCls} value={editForm.addr_line2} onChange={(e) => setEditForm((p) => ({ ...p, addr_line2: e.target.value }))} placeholder="" autoComplete="address-line2" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>City</label>
                      <input className={inputCls} value={editForm.addr_city} onChange={(e) => setEditForm((p) => ({ ...p, addr_city: e.target.value }))} autoComplete="address-level2" />
                    </div>
                    <div>
                      <label className={labelCls}>State</label>
                      <input className={inputCls} value={editForm.addr_state} onChange={(e) => setEditForm((p) => ({ ...p, addr_state: e.target.value }))} placeholder="CA" autoComplete="address-level1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>ZIP / Postal code</label>
                      <input className={inputCls} value={editForm.addr_postal_code} onChange={(e) => setEditForm((p) => ({ ...p, addr_postal_code: e.target.value }))} autoComplete="postal-code" />
                    </div>
                    <div>
                      <label className={labelCls}>Country</label>
                      <input className={inputCls} value={editForm.addr_country} onChange={(e) => setEditForm((p) => ({ ...p, addr_country: e.target.value }))} placeholder="US" autoComplete="country" />
                    </div>
                  </div>
                </div>
              </div>

              {saveError && (
                <p className="text-xs text-red-600">{saveError}</p>
              )}

              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-stone-900 px-6 py-2 text-xs font-medium tracking-wide text-white hover:bg-stone-700 disabled:opacity-60 transition-colors"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditing(false); setSaveError(null); }}
                  className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <Row label="Email"    value={user?.email ?? "—"} />
              <Row label="Name"     value={[profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "—"} />
              <Row label="Phone"    value={profile?.phone ?? "—"} />
              <Row label="Birthday" value={profile?.birthday
                ? new Date(profile.birthday + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })
                : "—"} />
              {profile?.gender && (
                <Row label="Gender" value={
                  profile.gender === "woman" ? "Woman"
                  : profile.gender === "man" ? "Man"
                  : profile.gender === "non_binary" ? "Non-binary"
                  : "Prefer not to say"
                } />
              )}
              {profile?.default_shipping_address?.line1 && (
                <div className="flex gap-6">
                  <span className="w-20 shrink-0 text-[11px] uppercase tracking-[0.14em] text-stone-400">Ship to</span>
                  <span className="text-sm text-stone-700 leading-relaxed">
                    {profile.default_shipping_address.line1}
                    {profile.default_shipping_address.line2 ? `, ${profile.default_shipping_address.line2}` : ""}
                    <br />
                    {[
                      profile.default_shipping_address.city,
                      profile.default_shipping_address.state,
                      profile.default_shipping_address.postal_code,
                    ].filter(Boolean).join(", ")}
                    {profile.default_shipping_address.country ? `, ${profile.default_shipping_address.country}` : ""}
                  </span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Orders ── */}
        <section>
          <p className="text-[10px] uppercase tracking-[0.22em] text-stone-400 mb-6">Order History</p>

          {orders.length === 0 ? (
            <div className="border border-stone-100 p-8 text-center">
              <p className="text-sm text-stone-400">No orders yet.</p>
              <Link
                href="/shop"
                className="mt-4 inline-block text-xs uppercase tracking-wide text-stone-500 underline underline-offset-4 hover:text-stone-900 transition-colors"
              >
                Start shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="border border-stone-100 p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-xs font-semibold text-stone-700">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <span className="text-stone-300">·</span>
                        <p className="text-xs text-stone-400 capitalize">
                          {STATUS_LABELS[order.status] ?? order.status}
                        </p>
                      </div>
                      <p className="mt-0.5 text-[11px] text-stone-400 capitalize">
                        {new Date(order.created_at).toLocaleDateString("en-US", {
                          month: "long", day: "numeric", year: "numeric",
                        })}
                        {" · "}
                        {order.fulfillment}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium text-stone-900">
                      {formatPrice(order.total_cents)}
                    </p>
                  </div>

                  <div className="space-y-1.5 border-t border-stone-100 pt-3">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex justify-between text-xs">
                        <span className="text-stone-600">
                          {item.product_name_snapshot}
                          {item.variant_label_snapshot ? ` — ${item.variant_label_snapshot}` : ""}
                          {item.quantity > 1 ? ` ×${item.quantity}` : ""}
                        </span>
                        <span className="text-stone-400 shrink-0 ml-4">
                          {formatPrice(item.line_total_cents)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Tracking — shown once admin sets a tracking number */}
                  {order.tracking_number && (
                    <div className="border-t border-stone-100 pt-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-stone-400 mb-1">
                        Tracking
                        {order.carrier ? ` · ${order.carrier}` : ""}
                      </p>
                      {order.tracking_url ? (
                        <a
                          href={order.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-stone-700 underline underline-offset-2 hover:text-stone-900"
                        >
                          {order.tracking_number}
                        </a>
                      ) : (
                        <p className="text-xs text-stone-700 font-mono">{order.tracking_number}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-6">
      <span className="w-20 shrink-0 text-[11px] uppercase tracking-[0.14em] text-stone-400">{label}</span>
      <span className="text-sm text-stone-700">{value}</span>
    </div>
  );
}
