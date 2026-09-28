type Task = { id: string; data: Record<string, any>; status: string };
const day = 86400000;
export function criticalPath(tasks: Task[]) {
  const map = new Map(tasks.map((t) => [t.id, t])),
    ordered: Task[] = [],
    visiting = new Set<string>(),
    visited = new Set<string>();
  function visit(t: Task) {
    if (visiting.has(t.id)) throw new Error("Task dependency cycle detected");
    if (visited.has(t.id)) return;
    visiting.add(t.id);
    for (const id of t.data.dependencies || []) {
      const dep = map.get(id);
      if (!dep) throw new Error("Dependency does not belong to this project");
      visit(dep);
    }
    visiting.delete(t.id);
    visited.add(t.id);
    ordered.push(t);
  }
  tasks.forEach(visit);
  const forward = new Map<
    string,
    { earlyStart: number; earlyFinish: number; duration: number }
  >();
  for (const t of ordered) {
    const duration = Math.max(
      1,
      Math.round(
        (Date.parse(t.data.endsOn) - Date.parse(t.data.startsOn)) / day,
      ) + 1,
    );
    const earlyStart = Math.max(
      0,
      ...(t.data.dependencies || []).map(
        (id: string) => forward.get(id)!.earlyFinish,
      ),
    );
    forward.set(t.id, {
      duration,
      earlyStart,
      earlyFinish: earlyStart + duration,
    });
  }
  const projectDuration = Math.max(
    0,
    ...[...forward.values()].map((t) => t.earlyFinish),
  );
  const late = new Map<string, number>();
  for (const t of [...ordered].reverse()) {
    const successors = tasks.filter((n) =>
      (n.data.dependencies || []).includes(t.id),
    );
    const lateFinish = successors.length
      ? Math.min(...successors.map((n) => late.get(n.id)!))
      : projectDuration;
    late.set(t.id, lateFinish - forward.get(t.id)!.duration);
  }
  return {
    durationDays: projectDuration,
    tasks: tasks.map((t) => {
      const f = forward.get(t.id)!;
      const slackDays = late.get(t.id)! - f.earlyStart;
      return { id: t.id, ...f, slackDays, critical: slackDays === 0 };
    }),
  };
}
export function earnedValue(
  tasks: Task[],
  budget: number,
  actual: number,
  asOf: string,
) {
  let pv = 0,
    ev = 0;
  const at = Date.parse(asOf);
  for (const t of tasks) {
    const start = Date.parse(t.data.startsOn),
      finish = Date.parse(t.data.endsOn) + day;
    const fraction = Math.max(
      0,
      Math.min(1, (at + day - start) / Math.max(day, finish - start)),
    );
    pv += t.data.budgetMinor * fraction;
    ev += (t.data.budgetMinor * t.data.percent) / 100;
  }
  const planned = Math.round(pv),
    earned = Math.round(ev),
    cpi = actual > 0 ? earned / actual : null,
    spi = planned > 0 ? earned / planned : null;
  const forecast = cpi && cpi > 0 ? Math.round(budget / cpi) : null;
  return {
    budget,
    actual,
    planned,
    earned,
    cpi,
    spi,
    costVariance: earned - actual,
    scheduleVariance: earned - planned,
    forecast,
    estimateToComplete:
      forecast === null ? null : Math.max(0, forecast - actual),
    varianceAtCompletion: forecast === null ? null : budget - forecast,
    coverage: budget
      ? Math.round(
          (tasks.reduce((s, t) => s + t.data.budgetMinor, 0) / budget) * 100,
        )
      : 0,
  };
}
