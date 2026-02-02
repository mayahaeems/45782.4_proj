export default function Loading({ lines = 5 }: { lines?: number }) {
  return (
    <div className="centerBox">
      <b>Loading…</b>
      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div className="skeleton" key={i} />
        ))}
      </div>
    </div>
  );
}
