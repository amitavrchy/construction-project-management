"use client";
import { useState } from "react";
import { ArrowUpRight, HardHat, ShieldCheck, ArrowRight } from "lucide-react";
import { useWorkspace } from "./provider";
export function Login() {
  const { login, error: connectionError } = useWorkspace();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <main className="login-page">
      <div className="login-story">
        <a className="brand" href="/">
          <span className="brand-symbol">
            <HardHat size={25} />
          </span>
          sitecraft<span className="brand-dot">.</span>
        </a>
        <div>
          <span className="eyebrow light">BUILT FOR THE WAY YOU BUILD</span>
          <h1>
            Great projects.
            <br />
            Grounded in clarity.
          </h1>
          <p>
            From the first foundation to the final handover. Bring your people,
            materials and budgets together.
          </p>
          <div className="blueprint">
            <div className="building b1" />
            <div className="building b2" />
            <div className="building b3" />
            <span className="blueprint-label">
              A stronger foundation for every project <ArrowUpRight size={18} />
            </span>
          </div>
        </div>
        <span className="login-foot">
          Construction management, made for Bangladesh.
        </span>
      </div>
      <div className="login-form">
        <div className="login-inner">
          <span className="eyebrow">YOUR SITE. YOUR WORKSPACE.</span>
          <h2>Welcome back</h2>
          <p className="muted">Sign in to keep your projects moving forward.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const f = new FormData(e.currentTarget);
              try {
                await login(String(f.get("email")), String(f.get("password")));
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Work email
              <input
                name="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                placeholder="Your password"
                autoComplete="current-password"
                required
              />
            </label>
            {busy && (
              <p role="status">
                The backend may take a minute to start. Waiting for a verified
                response.
              </p>
            )}
            {(error || connectionError) && (
              <div className="form-error" role="alert">
                {error || connectionError}
              </div>
            )}
            <button className="button primary full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in to workspace"}
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="secure-note">
            <ShieldCheck size={18} /> Secure access. Project-level permissions.
          </div>
          <p className="muted small">
            Need an account? Contact your company administrator.
          </p>
        </div>
      </div>
    </main>
  );
}
