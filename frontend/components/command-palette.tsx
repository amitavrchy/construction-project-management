"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowUpRight, Command } from "lucide-react";
import { routeForKind } from "../lib/advanced";
import { modules, navigation } from "../lib/modules";
import { useWorkspace } from "./provider";
import { Modal } from "./modal";
import { label } from "../lib/format";
export function CommandPalette() {
  const { snapshot: s } = useWorkspace();
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  const router = useRouter();
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);
  const routes = navigation
    .flatMap((g) => g.items)
    .filter(
      ([id, title]) =>
        (s?.role !== "CONTRACTOR" ||
          ["commercial", "bill", "workorder", "contractor"].includes(id)) &&
        title.toLowerCase().includes(query.toLowerCase()),
    );
  const results =
    s?.records
      .filter(
        (r) =>
          !["comment", "notification", "approvalrule"].includes(r.kind) &&
          [
            r.data.reference,
            r.data.name,
            r.data.title,
            r.data.description,
            r.data.code,
            r.data.sku,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase()),
      )
      .slice(0, 8) || [];
  function go(path: string) {
    router.push(path);
    setOpen(false);
    setQuery("");
  }
  return (
    <>
      <button
        className="command-trigger"
        aria-label="Search workspace"
        onClick={() => setOpen(true)}
      >
        <Search size={17} />
        <span>Search anything</span>
        <kbd>Ctrl K</kbd>
      </button>
      {open && (
        <Modal
          title="Find anything in your project"
          close={() => setOpen(false)}
        >
          <div className="command-search">
            <Search size={20} />
            <input
              autoFocus
              aria-label="Global project search"
              placeholder="Search references, people, work items or pages…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="command-results">
            <span className="eyebrow">PAGES</span>
            {routes.slice(0, 5).map(([id, title]) => (
              <button
                key={id}
                onClick={() => go(id === "dashboard" ? "/" : `/${id}`)}
              >
                <span>{title}</span>
                <ArrowUpRight size={17} />
              </button>
            ))}
            {query && (
              <>
                <span className="eyebrow">PROJECT RECORDS</span>
                {results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => go("/" + routeForKind(r.kind))}
                  >
                    <div>
                      <strong>
                        {r.data.reference ||
                          r.data.name ||
                          r.data.title ||
                          r.data.description ||
                          r.data.code}
                      </strong>
                      <span>
                        {label(r.kind)} · {label(r.status)}
                      </span>
                    </div>
                    <ArrowUpRight size={17} />
                  </button>
                ))}
                {!results.length && (
                  <p className="muted">No matching project records.</p>
                )}
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
