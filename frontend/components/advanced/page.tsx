"use client";
import { useEffect, useState } from "react";
import { Download, ShieldAlert } from "lucide-react";
import { api } from "../../lib/api";
import { Data } from "../../lib/types";
import { sections, advancedModules } from "../../lib/advanced";
import { useWorkspace } from "../provider";
import { AdvancedRegister } from "./register";
import { Planner } from "./planner";
import { ControlRoom } from "./control";
import { Approvals } from "./approvals";
import { ActivityLog } from "./activity";
export function AdvancedPage({ section }: { section: string }) {
  const { snapshot: s, projectId } = useWorkspace();
  const [people, setPeople] = useState<Data[]>([]),
    [analytics, setAnalytics] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [tab, setTab] = useState(sections[section]?.modules[0] || "");
  useEffect(() => {
    let current = true;
    if (!s || s.role === "CONTRACTOR") return;
    Promise.all([
      api(`projects/${projectId}/advanced/people`),
      api(`projects/${projectId}/advanced/analytics`),
    ])
      .then(([p, a]) => {
        if (current) {
          setPeople(p);
          setAnalytics(a);
          setError("");
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [projectId, s]);
  if (!s) return null;
  if (section === "planning")
    return <Planner people={people} analytics={analytics} />;
  if (section === "approvals") return <Approvals people={people} />;
  if (section === "control")
    return (
      <>
        {error && <p className="form-error">{error}</p>}
        <ControlRoom analytics={analytics} />
      </>
    );
  if (section === "activity") return <ActivityLog people={people} />;
  const config = sections[section];
  if (!config) return null;
  const risks = s.records.filter(
    (r) => r.kind === "risk" && r.status !== "CLOSED",
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CONNECTED PROJECT OPERATIONS</span>
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <a
          className="button secondary"
          href={`/api/projects/${projectId}/advanced/exports/${tab}`}
        >
          <Download size={17} />
          Export register
        </a>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {section === "risks" && (
        <div className="risk-overview panel">
          <div>
            <span className="eyebrow">PROBABILITY × IMPACT</span>
            <h2>Map your exposure</h2>
            <p>Open and mitigated risks stay visible until formally closed.</p>
            <div className="risk-totals">
              <span>
                <ShieldAlert size={19} />
                {risks.filter((r) => r.data.score >= 15).length} high exposure
              </span>
              <span>{risks.length} active risks</span>
            </div>
          </div>
          <div
            className="risk-matrix"
            role="img"
            aria-label="Five by five risk matrix, probability rows and impact columns"
          >
            {[5, 4, 3, 2, 1].flatMap((p) =>
              [1, 2, 3, 4, 5].map((i) => {
                const count = risks.filter(
                  (r) => r.data.probability === p && r.data.impact === i,
                ).length;
                return (
                  <div
                    key={`${p}-${i}`}
                    title={`Probability ${p}, impact ${i}: ${count} risks`}
                    className={
                      p * i >= 15
                        ? "matrix-high"
                        : p * i >= 8
                          ? "matrix-medium"
                          : "matrix-low"
                    }
                  >
                    {count || "·"}
                  </div>
                );
              }),
            )}
            <span>Impact increases → · Probability increases ↑</span>
          </div>
        </div>
      )}
      {config.modules.length > 1 && (
        <div
          className="view-tabs"
          role="tablist"
          aria-label={`${config.title} registers`}
        >
          {config.modules.map((k) => (
            <button
              role="tab"
              aria-selected={tab === k}
              className={tab === k ? "selected" : ""}
              key={k}
              onClick={() => setTab(k)}
            >
              {advancedModules[k].title}
            </button>
          ))}
        </div>
      )}
      <AdvancedRegister key={tab} kind={tab} people={people} />
    </>
  );
}
