"use client";
import { money } from "../lib/format";
export function BudgetChart({
  data,
}: {
  data: { code: string; budget: number; actual: number }[];
}) {
  const max = Math.max(1, ...data.flatMap((d) => [d.budget, d.actual]));
  return (
    <div
      className="budget-chart"
      role="img"
      aria-label="Approved budget and actual cost comparison by cost code"
    >
      <div className="chart-legend">
        <span>
          <i className="legend-budget" />
          Approved budget
        </span>
        <span>
          <i className="legend-actual" />
          Actual spend
        </span>
      </div>
      <div className="chart-grid">
        {[1, 0.75, 0.5, 0.25, 0].map((t) => (
          <div
            className="chart-grid-line"
            style={{ top: `${(1 - t) * 100}%` }}
            key={t}
          >
            <span>{money(max * t, true)}</span>
          </div>
        ))}
        <div className="chart-bars">
          {data.slice(0, 7).map((d) => (
            <div className="chart-column" key={d.code}>
              <div className="bar-pair">
                <div
                  className="bar budget-bar"
                  style={{ height: `${(d.budget / max) * 100}%` }}
                  title={`${d.code} budget: ${money(d.budget)}`}
                />
                <div
                  className="bar actual-bar"
                  style={{ height: `${(d.actual / max) * 100}%` }}
                  title={`${d.code} actual: ${money(d.actual)}`}
                />
              </div>
              <span>{d.code}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
