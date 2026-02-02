import React, { createContext, useContext, useMemo, useState } from "react";

type ToastItem = { id: string; title: string; detail?: string };
type ToastApi = { push: (t: Omit<ToastItem, "id">) => void };

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  function push(t: Omit<ToastItem, "id">) {
    const id = Math.random().toString(16).slice(2);
    const item: ToastItem = { id, ...t };
    setItems((prev) => [item, ...prev].slice(0, 3));
    setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 2800);
  }

  const api = useMemo(() => ({ push }), []);
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toastWrap">
        {items.map((t) => (
          <div className="toast" key={t.id}>
            <b>{t.title}</b>
            {t.detail ? (
              <div>
                <small>{t.detail}</small>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast must be used inside ToastProvider");
  return v;
}
