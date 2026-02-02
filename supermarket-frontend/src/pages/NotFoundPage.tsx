import AppShell from "../components/AppShell";
import Button from "../components/Button";
import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const nav = useNavigate();
  return (
    <AppShell>
      <div className="container" style={{ paddingTop: 18 }}>
        <div className="panel">
          <div className="panelHeader">
            <h2>404</h2>
            <small>Page not found</small>
          </div>
          <div className="centerBox">
            <b>Nothing here</b>
            <div style={{ marginBottom: 12 }}>Go back to products.</div>
            <Button onClick={() => nav("/products")}>Products</Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
