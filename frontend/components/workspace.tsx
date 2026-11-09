"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { useWorkspace } from "./provider";
import { Login } from "./login";
import { Dashboard } from "./dashboard";
import { RecordTable } from "./record-table";
import { Projects } from "./projects";
import { Stock } from "./stock";
import { Reports } from "./reports";
import { Team } from "./team";
import { Settings } from "./settings";
import { navigation, modules } from "../lib/modules";
import { label } from "../lib/format";
import { AdvancedPage } from "./advanced/page";
import { CommandPalette } from "./command-palette";
export function Workspace() {
  const {
    user,
    projects,
    projectId,
    setProjectId,
    snapshot: s,
    loading,
    error,
    refresh,
    logout,
  } = useWorkspace();
  const path = usePathname();
  const section = path.split("/")[1] || "control";
  const [mobile, setMobile] = useState(false),
    [refreshing, setRefreshing] = useState(false),
    [localError, setLocalError] = useState("");
  if (loading)
    return (
      <div className="initial-loading">
        <span className="brand-symbol">
          <Icons.HardHat size={28} />
        </span>
        <span>
          Connecting to your workspace. The backend may take a minute to start.
        </span>
        <span className="loader" />
      </div>
    );
  if (!user) return <Login />;
  const contractor = s?.role === "CONTRACTOR" || user.role === "CONTRACTOR";
  const name =
    section === "dashboard"
      ? "Overview"
      : modules[section]?.title || label(section);
  let content;
  if (section === "projects") content = <Projects />;
  else if (!projectId) content = <Projects />;
  else if (!s)
    content = (
      <div className="initial-loading content-loading">
        {error ? (
          <>
            <p className="form-error">{error}</p>
            <button
              className="button secondary"
              onClick={() =>
                void refresh().catch((e) => setLocalError(e.message))
              }
            >
              Retry
            </button>
          </>
        ) : (
          <>
            <span className="loader" />
            Loading project…
          </>
        )}
      </div>
    );
  else if (
    contractor &&
    !["bill", "workorder", "contractor", "settings", "commercial"].includes(
      section,
    )
  )
    content = <RecordTable key="bill" kind="bill" />;
  else if (
    [
      "control",
      "planning",
      "approvals",
      "procurement",
      "commercial",
      "budget-versions",
      "risks",
      "rfis",
      "site-diary",
      "activity",
      "automation",
    ].includes(section)
  )
    content = (
      <AdvancedPage key={`${projectId}:${section}`} section={section} />
    );
  else if (["dashboard", "overview"].includes(section)) content = <Dashboard />;
  else if (section in modules)
    content = <RecordTable key={`${projectId}:${section}`} kind={section} />;
  else if (section === "stock") content = <Stock />;
  else if (section === "reports") content = <Reports />;
  else if (section === "team") content = <Team />;
  else if (section === "settings") content = <Settings />;
  else
    content = (
      <div className="empty panel">
        <h1>Page not found</h1>
        <Link className="button primary" href="/control">
          Back to overview
        </Link>
      </div>
    );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace-main">
        Skip to content
      </a>
      {mobile && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "sidebar-open" : ""}`}>
        <Link href="/control" className="brand">
          <span className="brand-symbol">
            <Icons.HardHat size={25} />
          </span>
          sitecraft<span className="brand-dot">.</span>
        </Link>
        <div className="workspace-switch">
          <span className="workspace-logo">SC</span>
          <div>
            <strong>Sitecraft Construction</strong>
            <span>Company workspace</span>
          </div>
          <Icons.ChevronsUpDown size={16} />
        </div>
        <nav aria-label="Main navigation">
          {navigation.map((group) => {
            const items = group.items.filter(
              ([id]) =>
                !contractor ||
                ["bill", "workorder", "contractor", "commercial"].includes(id),
            );
            if (!items.length) return null;
            return (
              <div className="nav-group" key={group.label}>
                <span className="nav-label">{group.label}</span>
                {items.map(([id, title, icon]) => {
                  const Icon = (Icons as any)[icon] || Icons.Circle;
                  return (
                    <Link
                      key={id}
                      href={`/${id}`}
                      className={`nav-link ${section === id ? "active" : ""}`}
                      onClick={() => setMobile(false)}
                    >
                      <Icon size={19} />
                      <span>{title}</span>
                      {id === "requisition" &&
                        !!s?.records.filter(
                          (r) =>
                            r.kind === "requisition" &&
                            r.status === "SUBMITTED",
                        ).length && (
                          <span className="nav-count">
                            {
                              s.records.filter(
                                (r) =>
                                  r.kind === "requisition" &&
                                  r.status === "SUBMITTED",
                              ).length
                            }
                          </span>
                        )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          {user.role === "COMPANY_ADMIN" && (
            <Link
              href="/team"
              className={`nav-link ${section === "team" ? "active" : ""}`}
            >
              <Icons.Users size={19} />
              Team & access
            </Link>
          )}
          <Link
            href="/settings"
            className={`nav-link ${section === "settings" ? "active" : ""}`}
          >
            <Icons.Settings2 size={19} />
            Settings
          </Link>
          <div className="sidebar-help">
            <span className="live-dot" />
            Made for the builders.
          </div>
        </div>
        <div className="sidebar-profile">
          <span className="avatar">
            {user.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </span>
          <div>
            <strong>{user.name}</strong>
            <span>{label(s?.role || user.role)}</span>
          </div>
          <button
            className="icon-button"
            title="Sign out"
            aria-label="Sign out"
            onClick={() => void logout().catch((e) => setLocalError(e.message))}
          >
            <Icons.LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Icons.Menu size={23} />
            </button>
            <Icons.Building2 size={18} />
            <span>Workspace</span>
            <Icons.ChevronRight size={15} />
            <strong>{name}</strong>
          </div>
          <div className="topbar-actions">
            <CommandPalette />
            <span className="connection">
              <span className="live-dot" />
              Connected
            </span>
            <button
              className="icon-button"
              aria-label="Refresh project data"
              onClick={async () => {
                setRefreshing(true);
                try {
                  await refresh();
                } catch (e) {
                  setLocalError((e as Error).message);
                } finally {
                  setRefreshing(false);
                }
              }}
            >
              <Icons.RefreshCw size={18} className={refreshing ? "spin" : ""} />
            </button>
            <span className="topbar-divider" />
            <span className="avatar small-avatar">{user.name[0]}</span>
          </div>
        </header>
        <main id="workspace-main" className="main-content">
          <div className="context-bar">
            <div>
              <span className="context-square">
                <Icons.Building2 size={17} />
              </span>
              <select
                aria-label="Current project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                {!projects.length && <option value="">No projects yet</option>}
              </select>
            </div>
            <span className="context-note">
              <Icons.ShieldCheck size={15} />
              One workspace. Every detail.
            </span>
          </div>
          {localError && (
            <div className="form-error" role="alert">
              {localError}
              <button onClick={() => setLocalError("")} className="text-button">
                Dismiss
              </button>
            </div>
          )}
          <div className="page-content" key={`${section}:${projectId}`}>
            {content}
          </div>
        </main>
      </div>
    </div>
  );
}
