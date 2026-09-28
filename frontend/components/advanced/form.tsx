"use client";
import { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { advancedModules } from "../../lib/advanced";
import { Data, DomainRecord } from "../../lib/types";
import { today, money, label } from "../../lib/format";
import { useWorkspace } from "../provider";
export function AdvancedForm({
  kind,
  people,
  initial,
  close,
}: {
  kind: string;
  people: Data[];
  initial?: DomainRecord;
  close: () => void;
}) {
  const { snapshot: s, projectId, mutate } = useWorkspace(),
    config = advancedModules[kind];
  const [data, setData] = useState<Data>(() =>
    Object.fromEntries(
      config.fields.map((f) => [
        f.key,
        initial?.data[f.key] !== undefined
          ? f.type === "money"
            ? initial.data[f.key] / 100
            : initial.data[f.key]
          : f.multi
            ? []
            : (f.default ??
              (f.type === "date" ? today() : f.options?.[0] || "")),
      ]),
    ),
  );
  const blank = () =>
    config.lines === "budget"
      ? { costCode: "", amountMinor: 0 }
      : config.lines === "materials"
        ? { materialId: "", quantity: 1, costMinor: 0, costCode: "" }
        : config.lines === "contract"
          ? { boqId: "", quantity: 1, rateMinor: 0, costCode: "" }
          : { lineId: "", quantity: 1 };
  const [lines, setLines] = useState<Data[]>(
    () =>
      initial?.data.lines?.map((l: Data) =>
        config.lines === "budget"
          ? { costCode: l.costCode, amountMinor: l.amountMinor / 100 }
          : config.lines === "materials"
            ? {
                materialId: l.materialId,
                quantity: l.quantity,
                costMinor: l.costMinor / 100,
                costCode: l.costCode,
              }
            : config.lines === "contract"
              ? {
                  boqId: l.boqId,
                  quantity: l.quantity,
                  rateMinor: l.rateMinor / 100,
                  costCode: l.costCode,
                }
              : { lineId: l.lineId, quantity: l.quantity },
      ) || [blank()],
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function options(ref: string) {
    if (ref === "retentionbill")
      return (
        s?.records
          .filter(
            (r) =>
              r.kind === "measurementbill" &&
              r.status === "PAID" &&
              r.data.retention > 0 &&
              !r.data.retentionReleasedOn,
          )
          .map((r) => ({ value: r.id, text: r.data.reference })) || []
      );
    if (ref === "site")
      return (
        s?.project.sites.map((site) => ({ value: site.id, text: site.name })) ||
        []
      );
    if (ref === "person")
      return people.map((p) => ({ value: p.id, text: p.name }));
    return (
      s?.records
        .filter(
          (r) =>
            r.kind === ref &&
            r.id !== initial?.id &&
            (![
              "purchaseorder",
              "materialrequest",
              "contractpackage",
              "budgetrelease",
              "measurementbill",
            ].includes(ref) ||
              (ref === "purchaseorder"
                ? ["APPROVED", "PARTIAL_RECEIVED"]
                : ref === "materialrequest"
                  ? ["APPROVED", "PARTIAL_ISSUED"]
                  : ref === "measurementbill"
                    ? ["ACCOUNTS_APPROVED", "PARTIALLY_PAID"]
                    : ["APPROVED"]
              ).includes(r.status)),
        )
        .map((r) => ({
          value: r.id,
          text:
            r.data.reference ||
            r.data.name ||
            r.data.title ||
            r.data.code ||
            r.id.slice(0, 8),
        })) || []
    );
  }
  const parent = s?.records.find((r) => r.id === data[config.source || ""]);
  const sourceLines: Data[] = parent?.data.lines || [];
  function change(key: string, value: any) {
    setData((d) => ({ ...d, [key]: value }));
    if (key === config.source) setLines([blank()]);
    if (kind === "budgetrelease" && key === "previousId") {
      const prev = s?.records.find((r) => r.id === value);
      if (prev)
        setLines(
          prev.data.lines.map((l: Data) => ({
            costCode: l.costCode,
            amountMinor: l.amountMinor / 100,
          })),
        );
    }
  }
  function lineChange(index: number, key: string, value: any) {
    setLines((old) =>
      old.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, [key]: value };
        if (key === "materialId") {
          const m = s?.records.find((r) => r.id === value);
          const stock = s?.stock.find(
            (st) => st.materialId === value && st.siteId === data.siteId,
          );
          next.costMinor = (stock?.averageCostMinor || 0) / 100;
        }
        if (key === "boqId") {
          const b = s?.records.find((r) => r.id === value);
          next.rateMinor = (b?.data.rateMinor || 0) / 100;
          next.costCode = b?.data.costCode || "";
        }
        return next;
      }),
    );
  }
  const lineTotal = (row: Data) =>
    config.lines === "budget"
      ? Number(row.amountMinor) * 100
      : config.lines === "quantities"
        ? Number(row.quantity) *
          (sourceLines.find((l) => l.lineId === row.lineId)?.rateMinor ||
            sourceLines.find((l) => l.lineId === row.lineId)?.costMinor ||
            0)
        : Number(row.quantity) * Number(row.rateMinor ?? row.costMinor) * 100;
  const total = lines.reduce((n, l) => n + lineTotal(l), 0);
  return (
    <form
      className="record-form advanced-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const payload: Data = { ...data };
          for (const f of config.fields)
            if (f.type === "money")
              payload[f.key] = Math.round(Number(data[f.key]) * 100);
            else if (f.type === "number") payload[f.key] = Number(data[f.key]);
          if (config.lines)
            payload.lines = lines.map((row) =>
              Object.fromEntries(
                Object.entries(row).map(([key, value]) => [
                  key,
                  key.endsWith("Minor")
                    ? Math.round(Number(value) * 100)
                    : key === "quantity"
                      ? Number(value)
                      : value,
                ]),
              ),
            );
          if (initial) {
            payload.expectedVersion = initial.version;
            await mutate(
              `projects/${projectId}/advanced/records/${initial.id}`,
              payload,
              "PATCH",
            );
          } else
            await mutate(
              `projects/${projectId}/advanced/records/${kind}`,
              payload,
            );
          close();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-grid">
        {config.fields.map((f) => (
          <label
            key={f.key}
            className={f.type === "textarea" || f.multi ? "span-two" : ""}
          >
            {f.label}
            {f.optional && <span className="optional">Optional</span>}
            {f.ref ? (
              <select
                aria-label={f.label}
                multiple={f.multi}
                value={data[f.key]}
                required={!f.optional}
                onChange={(e) =>
                  change(
                    f.key,
                    f.multi
                      ? Array.from(e.target.selectedOptions).map((o) => o.value)
                      : e.target.value,
                  )
                }
              >
                {!f.multi && (
                  <option value="">Select {f.label.toLowerCase()}</option>
                )}
                {options(f.ref).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.text}
                  </option>
                ))}
              </select>
            ) : f.options ? (
              <select
                aria-label={f.label}
                value={data[f.key]}
                onChange={(e) => change(f.key, e.target.value)}
              >
                {f.options.map((o) => (
                  <option value={o} key={o}>
                    {label(o)}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                aria-label={f.label}
                value={data[f.key]}
                rows={3}
                onChange={(e) => change(f.key, e.target.value)}
                required={!f.optional}
              />
            ) : (
              <input
                aria-label={f.label}
                type={f.type === "money" ? "number" : f.type || "text"}
                min={f.type === "number" || f.type === "money" ? 0 : undefined}
                step={
                  f.type === "money"
                    ? ".01"
                    : f.type === "number"
                      ? ".001"
                      : undefined
                }
                required={!f.optional}
                value={data[f.key]}
                onChange={(e) => change(f.key, e.target.value)}
              />
            )}
          </label>
        ))}
      </div>
      {config.lines && (
        <section className="line-editor">
          <div className="line-editor-heading">
            <div>
              <h3>{config.lines === "budget" ? "Cost heads" : "Line items"}</h3>
              <p>Validated and saved together as one transaction.</p>
            </div>
            <button
              type="button"
              className="button secondary small-button"
              onClick={() => setLines((l) => [...l, blank()])}
            >
              <Plus size={16} />
              Add line
            </button>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {config.lines === "budget" ? (
                    <>
                      <th>Cost code</th>
                      <th>Budget (BDT)</th>
                    </>
                  ) : (
                    <>
                      <th>
                        {config.lines === "contract"
                          ? "BOQ item"
                          : config.lines === "materials"
                            ? "Material"
                            : "Approved line"}
                      </th>
                      <th>Quantity</th>
                      {config.lines !== "quantities" && (
                        <>
                          <th>Rate (BDT)</th>
                          <th>Cost code</th>
                        </>
                      )}
                    </>
                  )}
                  <th>Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lines.map((row, i) => (
                  <tr key={i}>
                    {config.lines === "budget" ? (
                      <>
                        <td>
                          <input
                            aria-label={`Line ${i + 1} cost code`}
                            value={row.costCode}
                            required
                            onChange={(e) =>
                              lineChange(i, "costCode", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`Line ${i + 1} budget`}
                            type="number"
                            min="0"
                            step=".01"
                            value={row.amountMinor}
                            onChange={(e) =>
                              lineChange(i, "amountMinor", e.target.value)
                            }
                            required
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <select
                            aria-label={`Line ${i + 1} item`}
                            value={row.materialId ?? row.boqId ?? row.lineId}
                            required
                            onChange={(e) =>
                              lineChange(
                                i,
                                config.lines === "materials"
                                  ? "materialId"
                                  : config.lines === "contract"
                                    ? "boqId"
                                    : "lineId",
                                e.target.value,
                              )
                            }
                          >
                            <option value="">Select item</option>
                            {config.lines === "quantities"
                              ? sourceLines.map((l) => (
                                  <option key={l.lineId} value={l.lineId}>
                                    {l.materialName || l.description} · ordered{" "}
                                    {l.quantity},{" "}
                                    {kind === "delivery"
                                      ? "received " + l.received
                                      : kind === "dispatch"
                                        ? "issued " + l.issued
                                        : "rate " + money(l.rateMinor)}
                                  </option>
                                ))
                              : s?.records
                                  .filter(
                                    (r) =>
                                      r.kind ===
                                      (config.lines === "materials"
                                        ? "material"
                                        : "boq"),
                                  )
                                  .map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.data.name || r.data.description}
                                    </option>
                                  ))}
                          </select>
                        </td>
                        <td>
                          <input
                            aria-label={`Line ${i + 1} quantity`}
                            type="number"
                            min=".001"
                            step=".001"
                            required
                            value={row.quantity}
                            onChange={(e) =>
                              lineChange(i, "quantity", e.target.value)
                            }
                          />
                        </td>
                        {config.lines !== "quantities" && (
                          <>
                            <td>
                              <input
                                aria-label={`Line ${i + 1} rate`}
                                type="number"
                                min="0"
                                step=".01"
                                required
                                value={row.rateMinor ?? row.costMinor}
                                onChange={(e) =>
                                  lineChange(
                                    i,
                                    config.lines === "contract"
                                      ? "rateMinor"
                                      : "costMinor",
                                    e.target.value,
                                  )
                                }
                              />
                            </td>
                            <td>
                              <input
                                aria-label={`Line ${i + 1} cost code`}
                                value={row.costCode}
                                required
                                onChange={(e) =>
                                  lineChange(i, "costCode", e.target.value)
                                }
                              />
                            </td>
                          </>
                        )}
                      </>
                    )}
                    <td className="strong">{money(lineTotal(row))}</td>
                    <td>
                      <button
                        type="button"
                        className="icon-button danger"
                        disabled={lines.length === 1}
                        aria-label={`Remove line ${i + 1}`}
                        onClick={() =>
                          setLines((l) => l.filter((_, idx) => idx !== i))
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="line-total">
            <span>{lines.length} line items</span>
            <strong>{money(total)}</strong>
          </div>
          {kind === "measurementbill" && parent && (
            <div className="bill-preview">
              <span>
                Retention {money((total * parent.data.retentionBps) / 10000)}
              </span>
              <span>
                Withholding {money((total * parent.data.taxBps) / 10000)}
              </span>
              <strong>
                Estimated net{" "}
                {money(
                  total -
                    Math.round((total * parent.data.retentionBps) / 10000) -
                    Math.round((total * parent.data.taxBps) / 10000) -
                    Number(data.advanceMinor || 0) * 100 -
                    Number(data.penaltyMinor || 0) * 100,
                )}
              </strong>
            </div>
          )}
        </section>
      )}
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={close}>
          Cancel
        </button>
        <button className="button primary" disabled={busy}>
          <Save size={17} />
          {busy
            ? "Saving…"
            : initial
              ? "Save changes"
              : "Create " + config.singular}
        </button>
      </div>
    </form>
  );
}
