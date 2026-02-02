import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Product } from "../types";

export type CartItem = { product: Product; qty: number };

type CartState = {
  items: CartItem[];
  add: (p: Product) => void;
  dec: (productId: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  total: number;
  count: number;
};

const Ctx = createContext<CartState | null>(null);
const LS_KEY = "sm_cart_v1";

function safeParse(json: string | null): CartItem[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    if (!Array.isArray(v)) return [];
    return v
      .filter((x) => x?.product?.id && typeof x?.qty === "number")
      .map((x) => ({ product: x.product as Product, qty: Number(x.qty) }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => safeParse(localStorage.getItem(LS_KEY)));

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  }, [items]);

  function add(p: Product) {
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.product.id === p.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [...prev, { product: p, qty: 1 }];
    });
  }

  function dec(productId: number) {
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.product.id === productId);
      if (idx < 0) return prev;
      const copy = [...prev];
      const nextQty = copy[idx].qty - 1;
      if (nextQty <= 0) return copy.filter((x) => x.product.id !== productId);
      copy[idx] = { ...copy[idx], qty: nextQty };
      return copy;
    });
  }

  function remove(productId: number) {
    setItems((prev) => prev.filter((x) => x.product.id !== productId));
  }

  function clear() {
    setItems([]);
  }

  const total = items.reduce((sum, x) => sum + x.product.price * x.qty, 0);
  const count = items.reduce((sum, x) => sum + x.qty, 0);

  const value = useMemo(() => ({ items, add, dec, remove, clear, total, count }), [items, total, count]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used inside CartProvider");
  return v;
}
