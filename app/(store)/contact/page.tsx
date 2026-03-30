"use client";

import { useState, useTransition } from "react";
import { submitContact } from "@/app/actions/contact";

const INQUIRY_TYPES = [
  { value: "",        label: "Select inquiry type" },
  { value: "general", label: "General" },
  { value: "bulk",    label: "Bulk Order" },
  { value: "custom",  label: "Custom Request" },
  { value: "support", label: "Support" },
];

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "", email: "", type: "", message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await submitContact({
        name:         form.name,
        email:        form.email,
        inquiry_type: form.type,
        message:      form.message,
      });
      if (result.error) {
        setError("Something went wrong. Please try again.");
      } else {
        setSubmitted(true);
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 md:px-8 py-20">

      <div className="mb-14">
        <h1 className="font-serif text-4xl text-stone-900 mb-4">Contact</h1>
        <p className="text-[13px] text-stone-400 leading-[1.9] max-w-sm">
          We&rsquo;d love to hear from you — whether it&rsquo;s a question,
          a custom request, or a large order. We usually respond within 2 business days.
        </p>
      </div>

      {submitted ? (
        <div className="py-16 text-center">
          <p className="text-sm font-medium text-stone-700 mb-2">Message received.</p>
          <p className="text-[13px] text-stone-400">
            We&rsquo;ll be in touch shortly.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">

          {error && (
            <p className="text-[13px] text-red-500">{error}</p>
          )}

          {/* Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="block text-[10px] uppercase tracking-[0.24em] text-stone-400">
              Name
            </label>
            <input
              id="name" name="name" type="text"
              value={form.name} onChange={handleChange} required
              className="w-full border-b border-stone-200 bg-transparent py-3 text-[14px] text-stone-800 placeholder-stone-300 outline-none focus:border-stone-500 transition-colors duration-150"
              placeholder="Your name"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-[10px] uppercase tracking-[0.24em] text-stone-400">
              Email
            </label>
            <input
              id="email" name="email" type="email"
              value={form.email} onChange={handleChange} required
              className="w-full border-b border-stone-200 bg-transparent py-3 text-[14px] text-stone-800 placeholder-stone-300 outline-none focus:border-stone-500 transition-colors duration-150"
              placeholder="your@email.com"
            />
          </div>

          {/* Inquiry type */}
          <div className="space-y-2">
            <label htmlFor="type" className="block text-[10px] uppercase tracking-[0.24em] text-stone-400">
              Inquiry Type
            </label>
            <select
              id="type" name="type"
              value={form.type} onChange={handleChange} required
              className="w-full border-b border-stone-200 bg-transparent py-3 text-[14px] text-stone-800 outline-none focus:border-stone-500 transition-colors duration-150 cursor-pointer appearance-none"
            >
              {INQUIRY_TYPES.map(({ value, label }) => (
                <option key={value} value={value} disabled={value === ""}>{label}</option>
              ))}
            </select>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label htmlFor="message" className="block text-[10px] uppercase tracking-[0.24em] text-stone-400">
              Message
            </label>
            <textarea
              id="message" name="message"
              value={form.message} onChange={handleChange} required
              rows={5}
              className="w-full border-b border-stone-200 bg-transparent py-3 text-[14px] text-stone-800 placeholder-stone-300 outline-none focus:border-stone-500 transition-colors duration-150 resize-none"
              placeholder="How can we help?"
            />
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isPending}
              className="text-[11px] uppercase tracking-[0.22em] text-white bg-stone-900 px-8 py-3.5 transition-colors duration-150 hover:bg-stone-700 disabled:opacity-60"
            >
              {isPending ? "Sending…" : "Send Message"}
            </button>
          </div>

        </form>
      )}
    </div>
  );
}
