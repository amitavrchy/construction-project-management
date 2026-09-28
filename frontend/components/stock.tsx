"use client";
import { useState } from "react";
import Link from "next/link";
import { PackagePlus, Search, Boxes, ArrowUpRight } from "lucide-react";
import { useWorkspace } from "./provider";
import { money, number } from "../lib/format";
import { Empty } from "./empty";
export function Stock() {
  const { snapshot: s } = useWorkspace();
  const [search, setSearch] = useState(""),
    [site, setSite] = useState("");
  if (!s) return null;
  const materials = s.records.filter((r) => r.kind === "material");
  const rows = s.stock.filter(
    (st) =>
      (!site || st.siteId === site) &&
      JSON.stringify(materials.find((m) => m.id === st.materialId)?.data)
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const total = s.stock.reduce(
    (a, st) => a + Number(st.quantity) * st.averageCostMinor,
    0,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">KNOW WHAT’S ON THE GROUND</span>
          <h1>Site stock</h1>
          <p>Live quantities. Moving average valuations. No guesswork.</p>
        </div>
        <Link href="/receipt" className="button primary">
          <PackagePlus size={18} />
          Receive materials
        </Link>
      </div>
      <div className="mini-stats">
        <div>
          <span>Inventory value</span>
          <strong>{money(total)}</strong>
        </div>
        <div>
          <span>Material positions</span>
          <strong>{s.stock.length}</strong>
        </div>
        <div>
          <span>Construction sites</span>
          <strong>{s.project.sites.length}</strong>
        </div>
      </div>
      <div className="panel">
        <div className="table-toolbar">
          <div className="search-input">
            <Search size={18} />
            <input
              placeholder="Search materials…"
              aria-label="Search materials"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={site}
            onChange={(e) => setSite(e.target.value)}
            aria-label="Filter stock by site"
          >
            <option value="">All sites</option>
            {s.project.sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </div>
        {rows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Site</th>
                  <th>Available quantity</th>
                  <th>Average unit cost</th>
                  <th>Stock value</th>
                  <th>Stock health</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((st) => {
                  const material = materials.find(
                    (m) => m.id === st.materialId,
                  );
                  const low =
                    Number(st.quantity) <= (material?.data.minimum || 0);
                  return (
                    <tr key={st.id}>
                      <td>
                        <strong>{material?.data.name}</strong>
                        <span className="cell-sub">{material?.data.sku}</span>
                      </td>
                      <td>
                        {
                          s.project.sites.find((site) => site.id === st.siteId)
                            ?.name
                        }
                      </td>
                      <td className="strong">
                        {number(Number(st.quantity))} {material?.data.unit}
                      </td>
                      <td>{money(st.averageCostMinor)}</td>
                      <td>
                        {money(Number(st.quantity) * st.averageCostMinor)}
                      </td>
                      <td>
                        <span className={`status ${low ? "amber" : "green"}`}>
                          <span />
                          {low ? "Running low" : "Healthy stock"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No stock positions yet"
            text="Receive your first delivery to start tracking site inventory."
          />
        )}
      </div>
    </>
  );
}
