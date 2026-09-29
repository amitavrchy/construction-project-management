"use client";
import { Data } from "../../lib/types";
import { money } from "../../lib/format";
export function CostCurve({ points }: { points: Data[] }) {
  if (!points.length)
    return (
      <p className="empty">
        Add dated work items to see the financial baseline.
      </p>
    );
  const max = Math.max(1, ...points.flatMap((p) => [p.planned, p.actual || 0]));
  const width = 760,
    height = 220,
    pad = 45;
  const x = (i: number) =>
      pad + (i / Math.max(1, points.length - 1)) * (width - pad - 15),
    y = (value: number) => height - 25 - (value / max) * (height - 45);
  const path = (key: string) =>
    points
      .map((p, i) =>
        p[key] === null ? "" : `${i === 0 ? "M" : "L"}${x(i)},${y(p[key])}`,
      )
      .filter(Boolean)
      .join(" ");
  return (
    <div className="cost-curve">
      <div className="chart-legend">
        <span>
          <i className="legend-budget" />
          Cumulative planned task cost
        </span>
        <span>
          <i className="legend-actual" />
          Cumulative actual ledger cost
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Cumulative planned versus actual cost across project months"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line
              x1={pad}
              y1={y(t * max)}
              x2={width - 15}
              y2={y(t * max)}
              stroke="#e5ebdd"
              strokeDasharray="4 4"
            />
            <text
              x={pad - 8}
              y={y(t * max) + 5}
              textAnchor="end"
              fontSize="14"
              fill="#8d9b7d"
            >
              {money(t * max, true)}
            </text>
          </g>
        ))}
        <path
          d={path("planned")}
          fill="none"
          stroke="#b7c89d"
          strokeWidth="3"
        />
        <path d={path("actual")} fill="none" stroke="#286d4c" strokeWidth="3" />
        {points.map((p, i) =>
          i % Math.max(1, Math.ceil(points.length / 7)) === 0 ? (
            <text
              key={p.date}
              x={x(i)}
              y={height - 3}
              textAnchor="middle"
              fontSize="14"
              fill="#8d9b7d"
            >
              {p.label}
            </text>
          ) : null,
        )}
      </svg>
      <p className="metric-footnote">
        Monthly planning follows task baseline dates. Actuals use ledger posting
        dates; future actuals are omitted.
      </p>
    </div>
  );
}
