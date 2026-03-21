export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 md:px-8">
      <section className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div className="space-y-6">
          <p className="upper-nav">New Collection</p>
          <h1 className="max-w-xl text-5xl font-semibold leading-tight">
            Tierra Oaxaca
          </h1>
          <p className="max-w-lg text-sm leading-7 text-stone-600">
            Boutique artisan clothing, shoes, pottery, and culturally rooted pieces.
          </p>
          <button className="h-11 rounded-none bg-stone-800 px-8 text-sm uppercase tracking-[0.18em] text-white">
            Shop Designs
          </button>
        </div>

        <div className="aspect-[4/5] border border-stone-300 bg-white" />
      </section>
    </div>
  );
}
