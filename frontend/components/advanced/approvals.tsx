"use client";
import { useState } from "react";
import { CheckCheck, Clock3, ArrowUpRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import {
  advancedActions,
  advancedModules,
  routeForKind,
} from "../../lib/advanced";
import { actions } from "../../lib/permissions";
import { Data, DomainRecord } from "../../lib/types";
import { money, label, readableDate } from "../../lib/format";
import { useWorkspace } from "../provider";
import { Status } from "../status";
import { Empty } from "../empty";
import { Modal } from "../modal";
export function Approvals({ people }: { people: Data[] }) {
  const { snapshot: s, projectId, user, mutate } = useWorkspace();
  const [filter, setFilter] = useState("MINE"),
    [selected, setSelected] = useState<DomainRecord | null>(null),
    [target, setTarget] = useState(""),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!s) return null;
  const pending = s.records.filter((r) =>
    ["SUBMITTED", "PM_APPROVED", "CALCULATED"].includes(r.status),
  );
  function available(r: DomainRecord) {
    let choices =
      r.kind in advancedModules
        ? advancedActions(r.kind, r.status, s!.role)
        : actions(r.kind, r.status, s!.role);
    if (r.createdBy === user?.id)
      choices = choices.filter(
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
      return [];
    return choices;
  }
  const rows = pending.filter((r) => filter === "ALL" || available(r).length);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">DECISIONS WITH A CLEAR TRAIL</span>
          <h1>Approval inbox</h1>
          <p>
            Review scope, quantities and value before making a recorded
            decision.
          </p>
        </div>
        <span className="approval-security">
          <ShieldCheck size={18} />
          Segregated approvals
        </span>
      </div>
      <div className="advanced-kpis">
        <div>
          <span>Awaiting review</span>
          <strong>{pending.length}</strong>
        </div>
        <div>
          <span>Actionable by you</span>
          <strong>{pending.filter((r) => available(r).length).length}</strong>
        </div>
        <div>
          <span>Pending face value</span>
          <strong>
            {money(
              pending.reduce(
                (a, r) =>
                  a +
                  (r.data.totalMinor ||
                    r.data.gross ||
                    r.data.amountMinor ||
                    0),
                0,
              ),
              true,
            )}
          </strong>
        </div>
      </div>
      <div className="view-tabs">
        <button
          className={filter === "MINE" ? "selected" : ""}
          onClick={() => setFilter("MINE")}
        >
          My decisions
        </button>
        <button
          className={filter === "ALL" ? "selected" : ""}
          onClick={() => setFilter("ALL")}
        >
          All pending
        </button>
      </div>
      <div className="approval-grid">
        {rows.map((r) => (
          <article className="panel approval-card" key={r.id}>
            <div className="approval-card-top">
              <span className="eyebrow">{label(r.kind)}</span>
              <Status value={r.status} />
            </div>
            <h3>
              {r.data.reference ||
                r.data.name ||
                r.data.billNo ||
                r.data.title ||
                label(r.kind) + " request"}
            </h3>
            <p>
              Submitted by{" "}
              {people.find((p) => p.id === r.createdBy)?.name ||
                "project member"}{" "}
              · {readableDate(r.createdAt)}
            </p>
            <div className="approval-value">
              <strong>
                {money(
                  r.data.totalMinor || r.data.gross || r.data.amountMinor || 0,
                )}
              </strong>
              <span>{r.data.lines?.length || 1} line items</span>
            </div>
            <div className="approval-card-foot">
              <Link href={`/${routeForKind(r.kind)}`} className="text-button">
                Open register
                <ArrowUpRight size={16} />
              </Link>
              {available(r).length ? (
                <button
                  className="button primary small-button"
                  onClick={() => {
                    setSelected(r);
                    setTarget(available(r)[0]);
                    setError("");
                    setNote("");
                  }}
                >
                  Review
                </button>
              ) : (
                <span className="muted">Another approver required</span>
              )}
            </div>
          </article>
        ))}
      </div>
      {!rows.length && (
        <div className="panel">
          <Empty
            title="Your decision queue is clear"
            text="Submitted records appear here when your project role can act on them."
          />
        </div>
      )}
      {selected && (
        <Modal
          title={`Review ${selected.data.reference || selected.data.name || label(selected.kind)}`}
          close={() => setSelected(null)}
        >
          <form
            className="record-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                if (selected.kind in advancedModules)
                  await mutate(
                    `projects/${projectId}/advanced/records/${selected.id}/transition`,
                    { action: target, expectedVersion: selected.version, note },
                  );
                else
                  await mutate(
                    `projects/${projectId}/records/${selected.id}/transition`,
                    { status: target, note },
                  );
                setSelected(null);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="review-total">
              <span>Amount under review</span>
              <strong>
                {money(
                  selected.data.totalMinor ||
                    selected.data.gross ||
                    selected.data.amountMinor ||
                    0,
                )}
              </strong>
            </div>
            {selected.data.lines && (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Scope</th>
                      <th>Quantity</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.data.lines.map((l: Data, i: number) => (
                      <tr key={i}>
                        <td>{l.materialName || l.description || l.costCode}</td>
                        <td>{l.quantity ?? "—"}</td>
                        <td>{money(l.amountMinor || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="form-grid">
              <label>
                Decision
                <select
                  aria-label="Approval decision"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                >
                  {available(selected).map((a) => (
                    <option key={a} value={a}>
                      {label(a)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="span-two">
                Decision note
                <textarea
                  aria-label="Approval note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  required={target === "REJECTED"}
                  rows={4}
                  maxLength={4000}
                />
              </label>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setSelected(null)}
              >
                Cancel
              </button>
              <button className="button primary" disabled={busy}>
                <CheckCheck size={18} />
                {busy ? "Recording…" : "Record decision"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
