import type { Product } from "../types";
import Button from "./Button";

function money(n: number) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "ILS" }).format(n);
  } catch {
    return `${n} ₪`;
  }
}

export default function ProductCard({
  p,
  onOpen,
  onAdd,
}: {
  p: Product;
  onOpen: () => void;
  onAdd: () => void;
}) {
  const desc = (p.description ?? "").trim() || "No description yet.";
  return (
    <div className="pcard">
      <div className="thumb" onClick={onOpen} style={{ cursor: "pointer" }} />
      <h3 className="pTitle">{p.name}</h3>
      <p className="pSub">{desc}</p>
      <div className="pFooter">
        <div className="price">{money(p.price)}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" onClick={onOpen}>View</Button>
          <Button onClick={onAdd}>Add</Button>
        </div>
      </div>
    </div>
  );
}
