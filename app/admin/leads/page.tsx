export default function AdminLeadsPage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Leads</h1>
        <p className="mt-2 text-sm text-stone-500">
          Subscribers, popup captures, waitlist signups, and custom requests.
        </p>
      </header>

      <div className="panel p-6">
        <p className="text-sm text-stone-600">
          V3 base only: split this into subscribers / waitlist / requests tables in V4 polish.
        </p>
      </div>
    </section>
  );
}
