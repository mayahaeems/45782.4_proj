import { useState } from "react";
import AppShell from "../components/AppShell";
import Field from "../components/Field";
import Button from "../components/Button";
import { useAuth } from "../app/AuthContext";
import { useToast } from "../components/Toast";

export default function LoginPage() {
  const auth = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onLogin() {
    setBusy(true);
    setErr(null);
    try {
      await auth.login({ email, password });
      toast.push({ title: "Logged in", detail: email });
    } catch (e: any) {
      setErr(e?.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="container" style={{ paddingTop: 18 }}>
        <div className="panel">
          <div className="panelHeader">
            <h2>Login</h2>
            <small>{auth.token ? "Already signed in" : "Use your account"}</small>
          </div>

          <div className="panelBody">
            <div style={{ maxWidth: 520 }}>
              <Field label="Email">
                <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
              </Field>

              <Field label="Password">
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </Field>

              <div style={{ display: "flex", gap: 10 }}>
                <Button onClick={onLogin} disabled={busy || !email || !password}>
                  {busy ? "Signing in…" : "Login"}
                </Button>
                <Button variant="secondary" onClick={auth.logout} disabled={!auth.token}>
                  Logout
                </Button>
              </div>

              {err ? (
                <div style={{
                  marginTop: 12,
                  border: "1px solid rgba(255,92,122,0.35)",
                  background: "rgba(255,92,122,0.10)",
                  padding: 10,
                  borderRadius: 12
                }}>
                  <b>Error</b>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>{err}</div>
                </div>
              ) : null}

              <div style={{ marginTop: 12, color: "var(--muted)", fontSize: 12 }}>
                If your backend login endpoint is different, change it in <code>AuthContext.tsx</code>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
