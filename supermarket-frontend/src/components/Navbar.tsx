import { Link } from "react-router-dom";
import Button from "./Button";
import { useAuth } from "../app/AuthContext";
import { useCart } from "../app/CartContext";

export default function Navbar() {
  const auth = useAuth();
  const cart = useCart();

  return (
    <div className="topbar">
      <div className="container">
        <div className="topbarInner">
          <Link to="/products" className="brand">
            <div className="logo" />
            <div>
              <p className="brandTitle">Supermarket</p>
              <p className="brandSub">Professional Frontend</p>
            </div>
          </Link>

          <div className="topActions">
            <Link to="/cart" style={{ color: "var(--muted)", fontSize: 12 }}>
              Cart: <b style={{ color: "var(--text)" }}>{cart.count}</b>
            </Link>

            {auth.token ? (
              <>
                <div style={{ color: "var(--muted)", fontSize: 12 }}>
                  Signed in as <b style={{ color: "var(--text)" }}>{auth.userEmail ?? "user"}</b>
                </div>
                <Button variant="secondary" onClick={auth.logout}>Logout</Button>
              </>
            ) : (
              <Link to="/login">
                <Button variant="secondary">Login</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
