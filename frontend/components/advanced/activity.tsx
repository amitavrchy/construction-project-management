"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Search, History, Eye, Check, ArrowUpRight } from "lucide-react";
import { api } from "../../lib/api";
import { Data } from "../../lib/types";
import { label, readableDate } from "../../lib/format";
import { routeForKind } from "../../lib/advanced";
import { useWorkspace } from "../provider";
import { Modal } from "../modal";
export function ActivityLog({ people }: { people: Data[] }) {
  const { snapshot: s, projectId, user, mutate } = useWorkspace();
  const [query, setQuery] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [result, setResult] = useState<Data | null>(null),
    [cursors, setCursors] = useState<string[]>([""]),
    [page, setPage] = useState(0),
    [view, setView] = useState<Data | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (query) params.set("action", query);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (cursors[page]) params.set("cursor", cursors[page]);
      api(`projects/${projectId}/advanced/audit?${params}`)
        .then((d) => {
          if (alive) {
            setResult(d);
            setError("");
          }
        })
        .catch((e) => {
          if (alive) setError(e.message);
        });
    }, 200);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [projectId, query, from, to, page, cursors, s]);
  if (!s) return null;
  const notifications = s.records.filter(
    (r) =>
      r.kind === "notification" &&
      !r.data.readBy?.includes(user?.id) &&
      (r.data.role === "ALL" ||
        r.data.role === s.role ||
        s.role === "COMPANY_ADMIN"),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">A DURABLE RECORD OF EVERY DECISION</span>
          <h1>Activity & notifications</h1>
          <p>
            Per-user read states and a searchable project audit, including
            revision history.
          </p>
        </div>
        <span className="date-pill">
          <Bell size={17} />
          {notifications.length} unread
        </span>
      </div>
      {notifications.length > 0 && (
        <div className="notification-grid">
          {notifications.slice(0, 6).map((n) => {
            const record = s.records.find((r) => r.id === n.data.recordId);
            return (
              <article className="panel notification-card" key={n.id}>
                <Bell size={19} />
                <div>
                  <strong>{n.data.title}</strong>
                  <p>{readableDate(n.createdAt)}</p>
                  {record && (
                    <Link
                      className="text-button"
                      href={`/${routeForKind(record.kind)}`}
                    >
                      Open register
                      <ArrowUpRight size={15} />
                    </Link>
                  )}
                </div>
                <button
                  className="icon-button"
                  aria-label="Mark notification as read"
                  onClick={async () => {
                    try {
                      await mutate(
                        `projects/${projectId}/advanced/notifications/${n.id}/read`,
                        {},
                      );
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  <Check size={18} />
                </button>
              </article>
            );
          })}
        </div>
      )}
      <div className="panel">
        <div className="panel-heading">
          <div>
            <h3>
              <History size={18} />
              Project audit
            </h3>
            <p>
              Project-scoped actions, actors, before/after values and decision
              notes.
            </p>
          </div>
          <span className="count-badge">{result?.total || 0} events</span>
        </div>
        <div className="table-toolbar audit-filters">
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label="Search audit actions"
              placeholder="Search actions, e.g. approved…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
                setCursors([""]);
              }}
            />
          </div>
          <label>
            From
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(0);
                setCursors([""]);
              }}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(0);
                setCursors([""]);
              }}
            />
          </label>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Actor</th>
                <th>Recorded at (Dhaka)</th>
                <th>Entity</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {result?.records.map((r: Data) => (
                <tr key={r.id}>
                  <td className="strong">
                    {label(r.action.replaceAll(".", " "))}
                  </td>
                  <td>
                    {r.actorId === "SYSTEM"
                      ? "Automation"
                      : people.find((p) => p.id === r.actorId)?.name ||
                        "Project member"}
                  </td>
                  <td>
                    {new Intl.DateTimeFormat("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Dhaka",
                    }).format(new Date(r.createdAt))}
                  </td>
                  <td>
                    {s.records.find((p) => p.id === r.entityId)?.data
                      .reference || r.entityId.slice(0, 12)}
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label="Inspect audit event"
                      onClick={() => setView(r)}
                    >
                      <Eye size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span>Page {page + 1} · 25 events per page</span>
          <div>
            <button
              className="button secondary small-button"
              disabled={!page}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              className="button secondary small-button"
              disabled={!result?.nextCursor}
              onClick={() => {
                setCursors((c) => [
                  ...c.slice(0, page + 1),
                  result!.nextCursor,
                ]);
                setPage((p) => p + 1);
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
      {view && (
        <Modal
          title={label(view.action.replaceAll(".", " "))}
          close={() => setView(null)}
        >
          <div className="detail-body">
            <p className="muted">Recorded {readableDate(view.createdAt)}</p>
            <pre className="audit-json">
              {JSON.stringify(view.detail, null, 2)}
            </pre>
          </div>
        </Modal>
      )}
    </>
  );
}
