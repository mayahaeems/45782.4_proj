import AppShell from "../components/AppShell";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import { useCart } from "../app/CartContext";

export default function CartPage() {
  const cart = useCart();

  return (
    <AppShell>
      <div className="hero">
        <div className="container">
          <div className="heroCard">
            <div>
              <h2 className="heroTitle">Cart</h2>
              <p className="heroSub">Your cart persists in localStorage (refresh-safe).</p>
            </div>
            <div className="kpis">
              <div className="kpi"><b>{cart.count}</b><span>Total items</span></div>
              <div className="kpi">
                <b>{new Intl.NumberFormat(undefined, { style: "currency", currency: "ILS" }).format(cart.total)}</b>
                <span>Total</span>
              </div>
              <div className="kpi"><b>{cart.items.length}</b><span>Unique products</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="panel">
          <div className="panelHeader">
            <h2>Items</h2>
            <small>{cart.items.length} rows</small>
          </div>

          {cart.items.length === 0 ? (
            <EmptyState title="Cart is empty" subtitle="Go add some products." />
          ) : (
            <div className="panelBody" style={{ display: "grid", gap: 10 }}>
              {cart.items.map((x) => (
                <div
                  key={x.product.id}
                  style={{
                    border: "1px solid var(--stroke)",
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: 14,
                    padding: "12px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <b>{x.product.name}</b>
                    <div style={{ color: "var(--muted)", fontSize: 12 }}>
                      Qty: {x.qty} • Unit: {new Intl.NumberFormat(undefined, { style: "currency", currency: "ILS" }).format(x.product.price)}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <b>
                      {new Intl.NumberFormat(undefined, { style: "currency", currency: "ILS" }).format(
                        x.product.price * x.qty
                      )}
                    </b>

                    <Button variant="secondary" onClick={() => cart.dec(x.product.id)}>-</Button>
                    <Button onClick={() => cart.add(x.product)}>+</Button>
                    <Button variant="danger" onClick={() => cart.remove(x.product.id)}>Remove</Button>
                  </div>
                </div>
              ))}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
                <Button variant="secondary" onClick={cart.clear}>Clear cart</Button>
                <Button onClick={() => alert("Checkout wiring comes next 🙂")}>Checkout</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
