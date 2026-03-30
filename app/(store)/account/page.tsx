"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

type Profile = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  birthday: string | null;
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
        .select("id, email, first_name, last_name, phone, birthday")
        .eq("id", session.user.id)
        .single();

      if (profileData) {
        setProfile(profileData as Profile);
        setEditForm({
          first_name: profileData.first_name ?? "",
          last_name:  profileData.last_name ?? "",
          phone:      profileData.phone ?? "",
          birthday:   profileData.birthday ?? "",
        });
      }

      // Load orders — RLS ensures only own orders
      const { data: ordersData } = await supabaseBrowser
        .from("orders")
        .select("id, created_at, status, total_cents, fulfillment, order_items(id, product_name_snapshot, variant_label_snapshot, quantity, line_total_cents)")
        .order("created_at", { ascending: false });

      setOrders((ordersData ?? []) as Order[]);
      setLoading(false);
    })();
  }, [router]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaveError(null);

    const { error } = await supabaseBrowser.from("profiles").upsert({
      id:         user.id,
      email:      user.email ?? "",
      first_name: editForm.first_name.trim() || null,
      last_name:  editForm.last_name.trim()  || null,
      phone:      editForm.phone.trim()      || null,
      birthday:   editForm.birthday          || null,
    });

    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }

    setProfile((prev) => prev ? {
      ...prev,
      first_name: editForm.first_name.trim() || null,
      last_name:  editForm.last_name.trim()  || null,
      phone:      editForm.phone.trim()      || null,
      birthday:   editForm.birthday          || null,
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
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-stone-500">
                        {new Date(order.created_at).toLocaleDateString("en-US", {
                          month: "long", day: "numeric", year: "numeric",
                        })}
                      </p>
                      <p className="text-[11px] text-stone-400 mt-0.5 capitalize">
                        {order.fulfillment} · {STATUS_LABELS[order.status] ?? order.status}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-stone-900">
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
