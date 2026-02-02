import { create } from "zustand";
import { persist } from "zustand/middleware";

type CartItem = { productId: number; qty: number };

type CartState = {
  items: CartItem[];
  add: (productId: number, qty?: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  count: number;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      count: 0,

      add: (productId, qty = 1) =>
        set((s) => {
          const items = [...s.items];
          const i = items.findIndex((x) => x.productId === productId);
          if (i >= 0) items[i].qty += qty;
          else items.push({ productId, qty });

          return {
            items,
            count: items.reduce((a, b) => a + b.qty, 0),
          };
        }),

      remove: (productId) =>
        set((s) => {
          const items = s.items.filter((x) => x.productId !== productId);
          return {
            items,
            count: items.reduce((a, b) => a + b.qty, 0),
          };
        }),

      clear: () => set({ items: [], count: 0 }),
    }),
    { name: "cart_store" }
  )
);
