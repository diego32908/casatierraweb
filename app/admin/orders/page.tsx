export default function AdminOrdersPage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Orders</h1>
        <p className="mt-2 text-sm text-stone-500">
          Review checkout results, fulfillment type, customer contact, and order status lifecycle.
        </p>
      </header>

      <div className="panel p-6">
        <p className="text-sm text-stone-600">
          V3 base only: status pipeline is PAID → READY_FOR_PICKUP / SHIPPED → COMPLETED.
        </p>
      </div>
    </section>
  );
}
