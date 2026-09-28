"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  TrendingUp,
  ShieldAlert,
  Wallet,
  Target,
  Activity,
  Download,
  GitBranch,
} from "lucide-react";
import { Data } from "../../lib/types";
import { money, readableDate } from "../../lib/format";
import { useWorkspace } from "../provider";
import { BudgetChart } from "../budget-chart";
export function ControlRoom({ analytics }: { analytics: Data | null }) {
  const { snapshot: s, projectId } = useWorkspace();
  if (!s) return null;
  if (!analytics)
    return <div className="empty panel">Calculating project indicators…</div>;
  const e = analytics.evm;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">DELIVERY. EXPOSURE. CASH.</span>
          <h1>Project control room</h1>
          <p>
            Ledger-backed costs and earned-value indicators as of{" "}
            {readableDate(analytics.asOf)}.
          </p>
        </div>
        <a
          className="button secondary"
          href={`/api/projects/${projectId}/reports/budget-vs-actual`}
        >
          <Download size={17} />
          Cost report
        </a>
      </div>
      <div className="control-hero">
        <div>
          <span className="banner-label">
            <span className="live-dot" />
            PROJECT INTELLIGENCE
          </span>
          <h2>
            Know where you stand.
            <br />
            Decide what comes next.
          </h2>
          <p>Connect approved scope, physical completion and actual cost.</p>
          <div className="control-hero-links">
            <Link href="/planning">
              Explore the plan
              <ArrowUpRight size={17} />
            </Link>
            <Link href="/approvals">
              Review commitments
              <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
        <div className="control-gauges">
          <div>
            <span>Cost efficiency</span>
            <strong>{e.cpi === null ? "—" : e.cpi.toFixed(2)}</strong>
            <small>CPI · EV / actual cost</small>
          </div>
          <div>
            <span>Schedule efficiency</span>
            <strong>{e.spi === null ? "—" : e.spi.toFixed(2)}</strong>
            <small>SPI · EV / planned value</small>
          </div>
        </div>
      </div>
      <div className="stat-grid control-stats">
        {[
          {
            title: "Budget at completion",
            value: money(e.budget, true),
            detail: "Current approved financial baseline",
            icon: Wallet,
            tone: "green",
          },
          {
            title: "Actual cost",
            value: money(e.actual, true),
            detail: "Posted ledger, including reversals",
            icon: Activity,
            tone: "blue",
          },
          {
            title: "Earned value",
            value: money(e.earned, true),
            detail: "Task budget × physical completion",
            icon: Target,
            tone: "orange",
          },
          {
            title: "Forecast at completion",
            value: e.forecast === null ? "—" : money(e.forecast, true),
            detail:
              e.forecast === null
                ? "Requires earned value and actual cost"
                : "EAC = approved budget / CPI",
            icon: TrendingUp,
            tone: "purple",
          },
        ].map((k) => (
          <div className="stat-card" key={k.title}>
            <div className="stat-top">
              <span>{k.title}</span>
              <span className={`stat-icon ${k.tone}`}>
                <k.icon size={20} />
              </span>
            </div>
            <strong>{k.value}</strong>
            <div className="stat-bottom">{k.detail}</div>
          </div>
        ))}
      </div>
      <div className="analytics-layout">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Cost performance by head</h3>
              <p>Approved scope including approved variations.</p>
            </div>
            <Link className="text-button" href="/budget-versions">
              Baseline
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <BudgetChart
            data={analytics.costs.map((r: Data) => ({
              code: r.costCode,
              budget: r.budget,
              actual: r.actual,
            }))}
          />
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Cash & commitments</h3>
              <p>Contract exposure is separate from posted cost.</p>
            </div>
            <Wallet size={21} />
          </div>
          <div className="finance-waterfall">
            {[
              {
                name: "Open approved order value",
                amount: analytics.commitments,
              },
              {
                name: "Certified outstanding payables",
                amount: analytics.payable,
              },
              { name: "Recorded payments", amount: analytics.cashPaid },
              { name: "Remaining cost estimate", amount: e.estimateToComplete },
            ].map((r, i) => (
              <div key={r.name}>
                <span>
                  <i className={`waterfall-${i}`} />
                  {r.name}
                </span>
                <strong>{r.amount === null ? "—" : money(r.amount)}</strong>
              </div>
            ))}
          </div>
          <p className="metric-footnote">
            Commitments show approved order face values, including partially
            received orders. Payments are recorded settlements.
          </p>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Earned-value health</h3>
              <p>Transparent formulas. No invented progress.</p>
            </div>
            <Target size={21} />
          </div>
          <div className="evm-grid">
            {[
              ["Planned value", money(e.planned)],
              ["Cost variance", money(e.costVariance)],
              ["Schedule variance", money(e.scheduleVariance)],
              [
                "Variance at completion",
                e.varianceAtCompletion === null
                  ? "—"
                  : money(e.varianceAtCompletion),
              ],
            ].map(([title, v]) => (
              <div key={title}>
                <span>{title}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
          <div className="coverage-note">
            <span>
              Task cost coverage:{" "}
              <strong>{e.coverage}% of approved budget</strong>
            </span>
            <p>
              EV and PV are computed only for planned tasks. A partial or
              overlapping task baseline changes the meaning of project-level
              forecasts.
            </p>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Risk & critical delivery</h3>
              <p>Focus on the activities with little room to move.</p>
            </div>
            <ShieldAlert size={21} />
          </div>
          <div className="exposure-list">
            {analytics.risks.slice(0, 3).map((r: Data) => (
              <Link key={r.id} href="/risks">
                <span
                  className={`risk-score ${r.data.score >= 15 ? "risk-high" : "risk-medium"}`}
                >
                  {r.data.score}
                </span>
                <div>
                  <strong>{r.data.title}</strong>
                  <p>{r.data.mitigation}</p>
                </div>
                <ArrowUpRight size={17} />
              </Link>
            ))}
            <Link href="/planning">
              <span className="attention-icon green">
                <GitBranch size={20} />
              </span>
              <div>
                <strong>
                  {
                    analytics.criticalPath.tasks.filter((t: Data) => t.critical)
                      .length
                  }{" "}
                  critical activities
                </strong>
                <p>
                  {analytics.criticalPath.durationDays} calendar days on the
                  dependency path.
                </p>
              </div>
              <ArrowUpRight size={17} />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
