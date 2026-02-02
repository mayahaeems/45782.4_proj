import { NavLink } from "react-router-dom";
import { useAuth } from "../app/AuthContext";

function Item({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <NavLink to={to} className={({ isActive }) => `navItem ${isActive ? "active" : ""}`} end>
      <span style={{ width: 22, textAlign: "center" }}>{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const auth = useAuth();
  const isAdmin = (auth.role ?? "").toLowerCase() === "admin";

  return (
    <aside className="sidebar">
      <div className="navGroup">
        <div className="navLabel">Shop</div>
        <Item to="/products" icon="🛒" label="Products" />
        <Item to="/cart" icon="🧺" label="Cart" />
      </div>

      <div className="navGroup">
        <div className="navLabel">Account</div>
        <Item to="/login" icon="🔐" label="Login" />
      </div>

      {isAdmin ? (
        <div className="navGroup">
          <div className="navLabel">Admin</div>
          <Item to="/admin/products" icon="🛠️" label="Manage products" />
        </div>
      ) : null}
    </aside>
  );
}
