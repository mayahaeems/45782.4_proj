import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api/client";
import type { Category, Product } from "../types";
import AppShell from "../components/AppShell";
import Loading from "../components/Loading";
import EmptyState from "../components/EmptyState";
import Field from "../components/Field";
import Button from "../components/Button";
import ProductCard from "../components/ProductCard";
import { useCart } from "../app/CartContext";
import { useToast } from "../components/Toast";
import { useAuth } from "../app/AuthContext";

type ListResponse<T> = T[] | { items: T[] };

function normalize<T>(r: ListResponse<T>): T[] {
  return Array.isArray(r) ? r : (r.items ?? []);
}

export default function ProductsPage() {
  const nav = useNavigate();
  const cart = useCart();
  const toast = useToast();
  const auth = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [p, c] = await Promise.all([
        apiGet<ListResponse<Product>>("/products", auth.token ?? undefined),
        apiGet<ListResponse<Category>>("/categories", auth.token ?? undefined).catch(() => [] as any),
      ]);
      setProducts(normalize(p));
      setCategories(normalize(c));
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return products.filter((p) => {
      const matchQ =
        !qq ||
        p.name.toLowerCase().includes(qq) ||
        (p.description ?? "").toLowerCase().includes(qq);

      const pid = p.category_id ?? p.category?.id ?? null;
      const matchC = cat === "all" ? true : pid === cat;
      return matchQ && matchC;
    });
  }, [products, q, cat]);

  return (
    <AppShell>
      <div className="hero">
        <div className="container">
          <div className="heroCard">
            <div>
              <h2 className="heroTitle">Products</h2>
              <p className="heroSub">
                Search, filter, and add items to your cart. This is a clean production-grade UI shell.
              </p>
            </div>
            <div className="kpis">
              <div className="kpi"><b>{products.length}</b><span>Total products</span></div>
              <div className="kpi"><b>{filtered.length}</b><span>Filtered</span></div>
              <div className="kpi"><b>{categories.length}</b><span>Categories</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="grid">
          <div className="panel">
            <div className="panelHeader">
              <h2>Filters</h2>
              <small>Search & category</small>
            </div>
            <div className="panelBody">
              <Field label="Search">
                <input
                  className="input"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Milk, bread…"
                />
              </Field>

              <Field label="Category">
                <select
                  className="select"
                  value={cat === "all" ? "all" : String(cat)}
                  onChange={(e) => setCat(e.target.value === "all" ? "all" : Number(e.target.value))}
                >
                  <option value="all">All</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>

              <div style={{ display: "flex", gap: 10 }}>
                <Button onClick={load}>Refresh</Button>
                <Button variant="secondary" onClick={() => { setQ(""); setCat("all"); }}>
                  Reset
                </Button>
              </div>

              {err ? (
                <div style={{
                  marginTop: 12,
                  border: "1px solid rgba(255,92,122,0.35)",
                  background: "rgba(255,92,122,0.10)",
                  padding: 10,
                  borderRadius: 12
                }}>
                  <b>Error</b>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>{err}</div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="panel">
            <div className="panelHeader">
              <h2>Catalog</h2>
              <small>{loading ? "Loading…" : `${filtered.length} items`}</small>
            </div>

            {loading ? (
              <Loading />
            ) : filtered.length === 0 ? (
              <EmptyState
                title="No products found"
                subtitle="Your database may be empty or filters are too strict."
                actionLabel="Reload"
                onAction={load}
              />
            ) : (
              <div className="productsGrid">
                {filtered.map((p) => (
                  <ProductCard
                    key={p.id}
                    p={p}
                    onOpen={() => nav(`/products/${p.id}`)}
                    onAdd={() => {
                      cart.add(p);
                      toast.push({ title: "Added to cart", detail: p.name });
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
