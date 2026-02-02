import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import Loading from "../components/Loading";
import Button from "../components/Button";
import { apiGet } from "../api/client";
import type { Product } from "../types";
import { useCart } from "../app/CartContext";
import { useToast } from "../components/Toast";
import { useAuth } from "../app/AuthContext";

export default function ProductPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const cart = useCart();
  const toast = useToast();
  const auth = useAuth();

  const [p, setP] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const prod = await apiGet<Product>(`/products/${id}`, auth.token ?? undefined);
        setP(prod);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load product");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <AppShell>
      <div className="container" style={{ paddingTop: 18 }}>
        <div className="panel">
          <div className="panelHeader">
            <h2>Product details</h2>
            <small>#{id}</small>
          </div>

          {loading ? (
            <Loading lines={6} />
          ) : err ? (
            <div className="centerBox">
              <b>Failed to load</b>
              <div style={{ marginBottom: 12 }}>{err}</div>
              <Button onClick={() => nav("/products")}>Back</Button>
            </div>
          ) : !p ? (
            <div className="centerBox"><b>Not found</b></div>
          ) : (
            <div className="panelBody">
              <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14 }}>
                <div className="thumb" style={{ height: 220 }} />
                <div>
                  <h2 style={{ margin: 0 }}>{p.name}</h2>
                  <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                    {(p.description ?? "").trim() || "No description yet."}
                  </p>

                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                      {new Intl.NumberFormat(undefined, { style: "currency", currency: "ILS" }).format(p.price)}
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: 12 }}>
                      Category: {p.category?.name ?? (p.category_id ? `#${p.category_id}` : "None")}
                    </div>
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                    <Button onClick={() => { cart.add(p); toast.push({ title: "Added to cart", detail: p.name }); }}>
                      Add to cart
                    </Button>
                    <Button variant="secondary" onClick={() => nav("/products")}>Back</Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
