"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { advancedModules, advancedActions, writers } from "../../lib/advanced";
import { Data, DomainRecord } from "../../lib/types";
import { money, label, readableDate } from "../../lib/format";
import { useWorkspace } from "../provider";
import { Status } from "../status";
import { Modal } from "../modal";
import { Empty } from "../empty";
import { AdvancedForm } from "./form";
export function AdvancedRegister({
  kind,
  people,
  hideHeading = false,
}: {
  kind: string;
  people: Data[];
  hideHeading?: boolean;
}) {
  const { snapshot: s, projectId, user, mutate } = useWorkspace();
  const config = advancedModules[kind];
  const requested = useSearchParams().get("record");
  const [adding, setAdding] = useState(false),
    [editing, setEditing] = useState<DomainRecord | null>(null),
    [viewId, setViewId] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("ALL"),
    [page, setPage] = useState(0),
    [error, setError] = useState(""),
    [decision, setDecision] = useState<{
      r: DomainRecord;
      action: string;
    } | null>(null),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [comment, setComment] = useState("");
  useEffect(() => {
    if (requested) setViewId(requested);
  }, [requested, kind]);
  if (!s) return null;
  const all = s.records.filter((r) => r.kind === kind);
  const records = all.filter(
    (r) =>
      (filter === "ALL" || r.status === filter) &&
      JSON.stringify(
        Object.fromEntries(
          Object.entries(r.data).filter(
            ([k]) => !["content", "photo"].includes(k),
          ),
        ),
      )
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const viewed = s.records.find((r) => r.id === viewId);
  const writable = writers[kind]?.includes(s.role);
  const summary = all.reduce(
    (a, r) => a + Number(r.data.totalMinor || r.data.amountMinor || 0),
    0,
  );
  const display = (key: string, v: any): any => {
    if (v === undefined || v === "") return "—";
    if (
      key.endsWith("Minor") ||
      ["gross", "net", "retention", "tax"].includes(key)
    )
      return money(Number(v));
    if (key.endsWith("Id") || ["assignedTo"].includes(key)) {
      const person = people.find((p) => p.id === v),
        site = s.project.sites.find((p) => p.id === v),
        r = s.records.find((p) => p.id === v);
      return (
        person?.name ||
        site?.name ||
        r?.data.reference ||
        r?.data.name ||
        r?.data.title ||
        String(v).slice(0, 8)
      );
    }
    if (key === "percent")
      return (
        <div className="inline-progress">
          <span>{v}%</span>
          <div className="progress-track">
            <i style={{ width: `${v}%` }} />
          </div>
        </div>
      );
    if (key === "score")
      return (
        <span
          className={`risk-score ${v >= 15 ? "risk-high" : v >= 8 ? "risk-medium" : "risk-low"}`}
        >
          {v}/25
        </span>
      );
    if (key === "priority")
      return (
        <span className={`priority priority-${String(v).toLowerCase()}`}>
          {label(v)}
        </span>
      );
    if (typeof v === "object")
      return Array.isArray(v) ? v.join(", ") : JSON.stringify(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return readableDate(v);
    return String(v);
  };
  function available(r: DomainRecord) {
    let list = advancedActions(r.kind, r.status, s!.role);
    if (r.createdBy === user?.id)
      list = list.filter(
        (a) =>
          ![
            "APPROVED",
            "PM_APPROVED",
            "ACCOUNTS_APPROVED",
            "REJECTED",
          ].includes(a),
      );
    const rule = s!.records
      .filter(
        (p) =>
          p.kind === "approvalrule" &&
          p.status === "ACTIVE" &&
          p.data.kind === r.kind &&
          p.data.thresholdMinor <= (r.data.totalMinor || 0),
      )
      .sort((a, b) => b.data.thresholdMinor - a.data.thresholdMinor)[0];
    if (
      rule?.data.requiredRole === "COMPANY_ADMIN" &&
      s!.role !== "COMPANY_ADMIN"
    )
      list = list.filter(
        (a) => !["APPROVED", "PM_APPROVED", "REJECTED"].includes(a),
      );
    return list;
  }
  return (
    <>
      <div className="register-heading">
        <div>
          {!hideHeading && (
            <>
              <h2>{config.title}</h2>
              <p>{config.description}</p>
            </>
          )}
        </div>
        {writable && (
          <button className="button primary" onClick={() => setAdding(true)}>
            <Plus size={18} />
            New {config.singular}
          </button>
        )}
      </div>
      <div className="advanced-kpis">
        <div>
          <span>Total records</span>
          <strong>{all.length}</strong>
        </div>
        <div>
          <span>Awaiting decision</span>
          <strong>
            {
              all.filter((r) => ["SUBMITTED", "PM_APPROVED"].includes(r.status))
                .length
            }
          </strong>
        </div>
        <div>
          <span>
            {kind === "risk"
              ? "High exposure"
              : kind === "task"
                ? "Completed items"
                : "Recorded value"}
          </span>
          <strong>
            {kind === "risk"
              ? all.filter((r) => r.data.score >= 15 && r.status !== "CLOSED")
                  .length
              : kind === "task"
                ? all.filter((r) => r.status === "DONE").length
                : money(summary, true)}
          </strong>
        </div>
      </div>
      <div className="panel">
        <div className="table-toolbar">
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label={`Search ${config.title}`}
              placeholder="Search records, references or cost codes…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <select
            aria-label="Filter advanced records by status"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="ALL">All statuses</option>
            {[...new Set(all.map((r) => r.status))].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        {records.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {config.columns.map((k) => (
                    <th key={k}>{label(k.replace(/Id$/, ""))}</th>
                  ))}
                  <th>Workflow</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(page * 12, page * 12 + 12).map((r) => (
                  <tr key={r.id}>
                    {config.columns.map((k, i) => (
                      <td className={i === 0 ? "strong" : ""} key={k}>
                        {display(k, r.data[k])}
                      </td>
                    ))}
                    <td>
                      <Status value={r.status} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          aria-label="View advanced record"
                          onClick={() => setViewId(r.id)}
                        >
                          <Eye size={17} />
                        </button>
                        {writable &&
                          (r.status === "DRAFT" ||
                            (["task", "risk", "rfi", "approvalrule"].includes(
                              kind,
                            ) &&
                              !["CLOSED", "DONE", "ANSWERED"].includes(
                                r.status,
                              ))) && (
                            <button
                              className="icon-button"
                              aria-label="Edit advanced record"
                              onClick={() => setEditing(r)}
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                        {available(r)
                          .slice(0, 1)
                          .map((a) => (
                            <button
                              key={a}
                              className="text-button"
                              onClick={() => {
                                setDecision({ r, action: a });
                                setNote("");
                              }}
                            >
                              {label(a)}
                              <ArrowRight size={15} />
                            </button>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Ready for the next level"
            text={`Create a ${config.singular} to start tracking this workflow.`}
          />
        )}
        <div className="table-footer">
          <span>
            {records.length} records · Validated workflows · Revision protection
          </span>
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
              disabled={(page + 1) * 12 >= records.length}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
      {(adding || editing) && (
        <Modal
          title={editing ? `Edit ${config.singular}` : `New ${config.singular}`}
          close={() => {
            setAdding(false);
            setEditing(null);
          }}
        >
          <AdvancedForm
            kind={kind}
            people={people}
            initial={editing || undefined}
            close={() => {
              setAdding(false);
              setEditing(null);
            }}
          />
        </Modal>
      )}
      {viewed && (
        <Modal
          title={
            viewed.data.reference ||
            viewed.data.title ||
            viewed.data.name ||
            config.singular
          }
          close={() => setViewId("")}
        >
          <div className="detail-body">
            <div className="detail-status">
              <Status value={viewed.status} />
              <span className="muted">Revision {viewed.version}</span>
            </div>
            <dl>
              {Object.entries(viewed.data)
                .filter(
                  ([k]) =>
                    ![
                      "lines",
                      "tasks",
                      "removedHeads",
                      "dependencies",
                      "readBy",
                    ].includes(k),
                )
                .map(([k, v]) => (
                  <div key={k}>
                    <dt>{label(k)}</dt>
                    <dd>{display(k, v)}</dd>
                  </div>
                ))}
            </dl>
            {viewed.data.lines && (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Item / cost code</th>
                      <th>Quantity</th>
                      <th>Previous / cumulative</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewed.data.lines.map((l: Data, i: number) => (
                      <tr key={i}>
                        <td>
                          {l.materialName || l.description || l.costCode}
                          <span className="cell-sub">{l.costCode}</span>
                        </td>
                        <td>
                          {l.quantity ?? "—"} {l.unit}
                        </td>
                        <td>
                          {l.previousQuantity !== undefined
                            ? `${l.previousQuantity} / ${l.cumulativeQuantity}`
                            : l.previousMinor !== undefined
                              ? money(l.previousMinor)
                              : l.received !== undefined
                                ? `Received ${l.received}`
                                : "—"}
                        </td>
                        <td>{money(l.amountMinor || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {viewed.data.tasks && (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Frozen work item</th>
                      <th>Baseline start</th>
                      <th>Baseline finish</th>
                      <th>Cost weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewed.data.tasks.map((t: Data) => (
                      <tr key={t.id}>
                        <td>
                          {t.code} · {t.title}
                        </td>
                        <td>{readableDate(t.startsOn)}</td>
                        <td>{readableDate(t.endsOn)}</td>
                        <td>{money(t.budgetMinor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="detail-actions">
              {available(viewed).map((a) => (
                <button
                  className={`button ${a === "REJECTED" ? "secondary danger" : "primary"}`}
                  key={a}
                  onClick={() => {
                    setDecision({ r: viewed, action: a });
                    setNote("");
                  }}
                >
                  {label(a)}
                </button>
              ))}
            </div>
            <section className="discussion">
              <h3>
                <MessageSquare size={18} />
                Discussion & decisions
              </h3>
              {s.records
                .filter(
                  (r) => r.kind === "comment" && r.data.recordId === viewed.id,
                )
                .slice()
                .reverse()
                .map((r) => (
                  <div className="comment" key={r.id}>
                    <strong>
                      {people.find((p) => p.id === r.createdBy)?.name ||
                        "Project member"}
                    </strong>
                    <p>{r.data.text}</p>
                    <span>{readableDate(r.createdAt)}</span>
                  </div>
                ))}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  try {
                    await mutate(
                      `projects/${projectId}/advanced/records/comment`,
                      { recordId: viewed.id, text: comment },
                    );
                    setComment("");
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label className="sr-only" htmlFor="record-comment">
                  Add a comment
                </label>
                <textarea
                  id="record-comment"
                  placeholder="Add context or a decision note…"
                  maxLength={300}
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <button className="button secondary" disabled={busy}>
                  Post comment
                </button>
              </form>
            </section>
          </div>
        </Modal>
      )}
      {decision && (
        <Modal
          title={`${label(decision.action)} · ${decision.r.data.reference || config.singular}`}
          close={() => setDecision(null)}
        >
          <form
            className="record-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await mutate(
                  `projects/${projectId}/advanced/records/${decision.r.id}/transition`,
                  {
                    action: decision.action,
                    expectedVersion: decision.r.version,
                    note,
                  },
                );
                setDecision(null);
                setError("");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <p className="decision-explainer">
              This decision is recorded in the project audit. Financial
              approvals require an authorized person other than the originator.
            </p>
            <label className="decision-note">
              {decision.action === "ANSWERED"
                ? "Authoritative answer"
                : "Decision note"}
              <textarea
                aria-label="Decision note"
                rows={4}
                required={["REJECTED", "ANSWERED"].includes(decision.action)}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={4000}
              />
            </label>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setDecision(null)}
              >
                Cancel
              </button>
              <button className="button primary" disabled={busy}>
                {busy
                  ? "Recording…"
                  : "Confirm " + label(decision.action).toLowerCase()}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
