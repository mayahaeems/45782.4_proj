import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { Category, Product } from "../types";
import ProductCard from "../components/ProductCard";
import { useAuth } from "../styles/auth";
import { useCart } from "../styles/cart";

type ProductsResponse = Product[] | { items: Product[] };

export default function Home() {
  const token = useAuth((s) => s.token);
  const add = useCart((s) => s.add);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [categoryId, setCategoryId] = useState<number | "all">("all");
  const [q, setQ] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const [cRes, pRes] = await Promise.all([
          api.get<Category[]>("/categories"),
          api.get<ProductsResponse>("/products"),
        ]);

        if (!alive) return;

        setCategories(cRes.data ?? []);

        const raw = pRes.data;
        const list = Array.isArray(raw) ? raw : raw.items ?? [];
        setProducts(list);
      } catch (e: any) {
        if (!alive) return;
        setError(
          e?.response?.data?.error ?? e?.message ?? "Failed to load products"
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return products
      .filter((p) => {
        if (categoryId === "all") return true;
        const pid = p.category_id ?? p.category?.id ?? null;
        return pid === categoryId;
      })
      .filter((p) => (qq ? p.name.toLowerCase().includes(qq) : true));
  }, [products, categoryId, q]);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
      <aside className="rounded-2xl border bg-white p-4 h-fit">
        <div className="font-semibold mb-3">Filters</div>

        <label className="text-sm text-gray-600">Search</label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
          placeholder="Milk, bread..."
        />

        <div className="mt-4">
          <div className="text-sm text-gray-600 mb-2">Category</div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => setCategoryId("all")}
              className={[
                "text-left rounded-xl px-3 py-2 border transition",
                categoryId === "all"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white hover:bg-gray-50",
              ].join(" ")}
            >
              All
            </button>

            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={[
                  "text-left rounded-xl px-3 py-2 border transition",
                  categoryId === c.id
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white hover:bg-gray-50",
                ].join(" ")}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          {loading ? "Loading…" : `${filtered.length} items`}
        </div>
      </aside>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Products</h1>
            <div className="text-sm text-gray-600">
              {loading ? "Loading products…" : `${filtered.length} items`}
            </div>
          </div>

          {error ? <div className="text-sm text-red-600">⚠ {error}</div> : null}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border bg-white p-4">
                <div className="h-24 rounded-xl bg-gray-100 animate-pulse" />
                <div className="mt-3 h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
                <div className="mt-2 h-4 w-1/2 bg-gray-100 rounded animate-pulse" />
                <div className="mt-4 h-9 w-full bg-gray-100 rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-gray-700">
            No products found. Try clearing filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                p={p}
                onOpen={() => {}}
                onAdd={() => {
                  if (!token) return;
                  add(p.id, 1);
                }}
              />
            ))}
          </div>
        )}

        {!token && (
          <div className="mt-6 rounded-2xl border bg-white p-4 text-sm text-gray-700">
            To add to cart — you need to log in.
          </div>
        )}
      </section>
    </div>
  );
}
