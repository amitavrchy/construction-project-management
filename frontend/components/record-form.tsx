"use client";
import { useState } from "react";
import { Save, UploadCloud } from "lucide-react";
import { Field, Data } from "../lib/types";
import { today, label } from "../lib/format";
import { useWorkspace } from "./provider";
export function RecordForm({
  fields,
  onSubmit,
  close,
  initial = {},
}: {
  initial?: Data;
  fields: Field[];
  onSubmit: (data: Data) => Promise<unknown>;
  close: () => void;
}) {
  const { snapshot } = useWorkspace();
  const [data, setData] = useState<Data>(() =>
      Object.fromEntries(
        fields.map((f) => [
          f.key,
          initial[f.key] !== undefined
            ? f.type === "money"
              ? initial[f.key] / 100
              : initial[f.key]
            : (f.default ??
              (f.type === "date" ? today() : (f.options?.[0] ?? ""))),
        ]),
      ),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const set = (key: string, value: unknown) =>
    setData((d) => ({ ...d, [key]: value }));
  async function file(key: string, value?: File) {
    if (!value) return;
    setError("");
    const limit = key === "photo" ? 2_000_000 : 4_000_000;
    if (value.size > limit) {
      setError(`File must be smaller than ${limit / 1000000} MB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      set(key, reader.result);
      if (key === "content") set("fileName", value.name);
    };
    reader.onerror = () => setError("File could not be read");
    reader.readAsDataURL(value);
  }
  return (
    <form
      className="record-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const payload = { ...data };
          for (const f of fields)
            if (f.type === "money")
              payload[f.key] = Math.round(Number(data[f.key]) * 100);
            else if (f.type === "number") payload[f.key] = Number(data[f.key]);
          await onSubmit(payload);
          close();
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-grid">
        {fields.map((f) => {
          let options = f.options?.map((v) => ({ value: v, text: label(v) }));
          if (f.ref === "site")
            options = snapshot?.project.sites.map((s) => ({
              value: s.id,
              text: s.name,
            }));
          else if (f.ref)
            options = snapshot?.records
              .filter(
                (r) =>
                  r.kind === f.ref &&
                  (f.ref !== "requisition" ||
                    ["APPROVED", "PARTIAL_ISSUED"].includes(r.status)),
              )
              .map((r) => ({
                value: r.id,
                text:
                  r.data.name ||
                  r.data.title ||
                  r.data.description ||
                  r.data.billNo ||
                  `${r.kind} ${r.id.slice(0, 8)}`,
              }));
          return (
            <label
              key={f.key}
              className={
                ["textarea", "file"].includes(f.type || "") ? "span-two" : ""
              }
            >
              {f.label}
              {f.optional && <span className="optional">Optional</span>}
              {options ? (
                <select
                  aria-label={f.label}
                  value={data[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  required={!f.optional}
                >
                  <option value="">Select {f.label.toLowerCase()}</option>
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.text}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  aria-label={f.label}
                  rows={3}
                  maxLength={2000}
                  value={data[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  required={!f.optional}
                />
              ) : f.type === "file" ? (
                <span className="upload-field">
                  <UploadCloud size={24} />
                  <span>
                    {data[f.key]
                      ? "File attached. Choose to replace."
                      : "Choose a file to upload"}
                  </span>
                  <input
                    aria-label={f.label}
                    type="file"
                    accept={
                      f.key === "photo"
                        ? "image/png,image/jpeg,image/webp"
                        : "application/pdf,image/png,image/jpeg,image/webp"
                    }
                    required={!f.optional && !data[f.key]}
                    onChange={(e) => void file(f.key, e.target.files?.[0])}
                  />
                </span>
              ) : (
                <input
                  aria-label={f.label}
                  type={f.type === "money" ? "number" : f.type || "text"}
                  step={
                    f.type === "money"
                      ? "0.01"
                      : f.type === "number"
                        ? "0.001"
                        : undefined
                  }
                  min={
                    ["money", "number"].includes(f.type || "") ? 0 : undefined
                  }
                  maxLength={f.type === "password" ? 200 : 500}
                  value={data[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  required={!f.optional}
                />
              )}
            </label>
          );
        })}
      </div>
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
          {busy ? "Saving…" : "Save record"}
        </button>
      </div>
    </form>
  );
}
