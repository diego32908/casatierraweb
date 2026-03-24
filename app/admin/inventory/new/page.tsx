import { ProductForm } from "@/components/admin/product-form";

export default function NewProductPage() {
  return (
    <section className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">New Product</h1>
        <p className="mt-2 text-sm text-stone-500">
          After creating, you can add variants on the edit page.
        </p>
      </header>

      <ProductForm />
    </section>
  );
}
