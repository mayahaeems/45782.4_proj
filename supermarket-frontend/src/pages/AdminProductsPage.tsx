import AppShell from "../components/AppShell";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../app/AuthContext";

export default function AdminProductsPage() {
  const auth = useAuth();
  const isAdmin = (auth.role ?? "").toLowerCase() === "admin";

  return (
    <AppShell>
      <div className="container" style={{ paddingTop: 18 }}>
        <div className="panel">
          <div className="panelHeader">
            <h2>Admin • Products</h2>
            <small>CRUD wiring comes next</small>
          </div>

          {!isAdmin ? (
            <EmptyState title="No access" subtitle="You must be admin to manage products." />
          ) : (
            <EmptyState title="Admin area ready" subtitle="Next: connect create/edit/delete endpoints." />
          )}
        </div>
      </div>
    </AppShell>
  );
}
