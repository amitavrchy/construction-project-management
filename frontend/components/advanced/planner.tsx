"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarRange,
  KanbanSquare,
  ListTree,
  Plus,
  Flag,
  UserRound,
  Link2,
} from "lucide-react";
import { Data, DomainRecord } from "../../lib/types";
import { readableDate, label } from "../../lib/format";
import { useWorkspace } from "../provider";
import { AdvancedRegister } from "./register";
import { Modal } from "../modal";
import { AdvancedForm } from "./form";
import { writers } from "../../lib/advanced";
export function Planner({
  people,
  analytics,
}: {
  people: Data[];
  analytics: Data | null;
}) {
  const { snapshot: s, projectId, mutate } = useWorkspace();
  const params = useSearchParams(),
    requested = params.get("register");
  const [view, setView] = useState("timeline"),
    [adding, setAdding] = useState(false),
    [editing, setEditing] = useState<DomainRecord | null>(null),
    [error, setError] = useState(""),
    [dragged, setDragged] = useState("");
  useEffect(() => {
    if (requested === "schedulebaseline") setView("baselines");
    else if (requested === "task" && params.get("record")) setView("register");
  }, [requested, params]);
  if (!s) return null;
  const tasks = s.records.filter((r) => r.kind === "task"),
    writable = writers.task.includes(s.role);
  const min = Math.min(
    ...tasks.map((t) => Date.parse(t.data.startsOn)),
    Date.parse(s.project.startsOn),
  );
  const max = Math.max(
    ...tasks.map((t) => Date.parse(t.data.endsOn)),
    Date.parse(s.project.endsOn),
  );
  const days = Math.max(1, (max - min) / 86400000);
  const cpm = analytics?.criticalPath?.tasks || [];
  async function move(id: string, action: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === action) return;
    try {
      await mutate(`projects/${projectId}/advanced/records/${id}/transition`, {
        action,
        expectedVersion: task.version,
        note: "Moved on planning board",
      });
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            PLAN THE WORK. CONNECT THE DEPENDENCIES.
          </span>
          <h1>Project planning</h1>
          <p>
            A work breakdown, dependency timeline and execution board in one
            place.
          </p>
        </div>
        {writable && (
          <button className="button primary" onClick={() => setAdding(true)}>
            <Plus size={18} />
            New work item
          </button>
        )}
      </div>
      <div className="planning-summary">
        <div>
          <strong>{tasks.length}</strong>
          <span>Work items</span>
        </div>
        <div>
          <strong>{cpm.filter((t: Data) => t.critical).length}</strong>
          <span>Critical activities</span>
        </div>
        <div>
          <strong>{analytics?.criticalPath?.durationDays || 0} days</strong>
          <span>Dependency path</span>
        </div>
        <div>
          <strong>
            {tasks.filter((t) => t.status === "DONE").length}/{tasks.length}
          </strong>
          <span>Completed</span>
        </div>
      </div>
      <div className="view-tabs" role="tablist" aria-label="Planning view">
        {[
          { id: "timeline", icon: CalendarRange, name: "Timeline" },
          { id: "board", icon: KanbanSquare, name: "Execution board" },
          { id: "register", icon: ListTree, name: "WBS register" },
          { id: "baselines", icon: Flag, name: "Approved baselines" },
        ].map((v) => (
          <button
            role="tab"
            aria-selected={view === v.id}
            key={v.id}
            className={view === v.id ? "selected" : ""}
            onClick={() => setView(v.id)}
          >
            <v.icon size={17} />
            {v.name}
          </button>
        ))}
      </div>
      {!!analytics?.criticalPath?.overrunDays && (
        <div className="schedule-warning">
          <Flag size={19} />
          <div>
            <strong>
              The dependency path exceeds the project window by{" "}
              {analytics.criticalPath.overrunDays} days.
            </strong>
            <p>
              {analytics.criticalPath.baselineConflicts.length} activities have
              baseline dates that overlap their finish-to-start predecessors.
              Review the schedule before committing a new baseline.
            </p>
          </div>
        </div>
      )}
      {view === "baselines" && (
        <AdvancedRegister kind="schedulebaseline" people={people} />
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {view === "timeline" && (
        <div className="panel timeline-panel">
          <div className="panel-heading">
            <div>
              <h3>Linked delivery timeline</h3>
              <p>
                Critical activities have zero total float. Planning uses
                calendar days.
              </p>
            </div>
            <span className="critical-legend">
              <i />
              Critical path
            </span>
          </div>
          <div className="timeline-scroll">
            <div className="timeline-ruler">
              <span>Work item / owner</span>
              <div>
                <span>{readableDate(new Date(min).toISOString())}</span>
                <span>{readableDate(new Date(max).toISOString())}</span>
              </div>
            </div>
            {tasks.map((t) => {
              const cp = cpm.find((p: Data) => p.id === t.id);
              return (
                <div className="timeline-row" key={t.id}>
                  <button
                    className="timeline-label"
                    onClick={() => writable && setEditing(t)}
                  >
                    <strong>
                      {t.data.code} · {t.data.title}
                    </strong>
                    <span>
                      {people.find((p) => p.id === t.data.ownerId)?.name ||
                        "Unassigned"}{" "}
                      · {t.data.percent}% · {cp?.slackDays ?? 0}d float
                    </span>
                  </button>
                  <div className="timeline-track">
                    <button
                      title={`${t.data.title}: ${readableDate(t.data.startsOn)} – ${readableDate(t.data.endsOn)}`}
                      className={`timeline-bar ${cp?.critical ? "critical" : ""}`}
                      style={{
                        left: `${((Date.parse(t.data.startsOn) - min) / 86400000 / days) * 100}%`,
                        width: `${Math.max(2, (((Date.parse(t.data.endsOn) - Date.parse(t.data.startsOn)) / 86400000 + 1) / days) * 100)}%`,
                      }}
                      onClick={() => writable && setEditing(t)}
                    >
                      <i style={{ width: `${t.data.percent}%` }} />
                      <span>{t.data.code}</span>
                    </button>
                  </div>
                </div>
              );
            })}
            {!tasks.length && (
              <div className="empty">
                <CalendarRange size={32} />
                <h3>Turn your scope into a delivery plan</h3>
                <p>Create work items and link predecessor activities.</p>
              </div>
            )}
          </div>
          <div className="timeline-foot">
            The critical path is calculated from task durations and dependency
            links. Bar positions show the entered baseline dates.
          </div>
        </div>
      )}
      {view === "board" && (
        <div className="kanban-board">
          {["BACKLOG", "IN_PROGRESS", "BLOCKED", "DONE"].map((status) => (
            <section
              className={`kanban-column column-${status.toLowerCase()}`}
              key={status}
              onDragOver={(e) => {
                if (writable) e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragged) void move(dragged, status);
                setDragged("");
              }}
            >
              <h3>
                <i />
                {label(status)}
                <span>{tasks.filter((t) => t.status === status).length}</span>
              </h3>
              {tasks
                .filter((t) => t.status === status)
                .map((t) => (
                  <article
                    key={t.id}
                    className="task-card"
                    draggable={writable}
                    onDragStart={() => setDragged(t.id)}
                  >
                    <div>
                      <span>{t.data.code}</span>
                      <span
                        className={`priority priority-${t.data.priority.toLowerCase()}`}
                      >
                        {label(t.data.priority)}
                      </span>
                    </div>
                    <button
                      className="task-card-title"
                      onClick={() => writable && setEditing(t)}
                    >
                      {t.data.title}
                    </button>
                    <p>
                      <UserRound size={14} />
                      {people.find((p) => p.id === t.data.ownerId)?.name ||
                        "Unassigned"}
                    </p>
                    <div className="progress-track">
                      <i style={{ width: `${t.data.percent}%` }} />
                    </div>
                    <div className="task-card-foot">
                      <span>
                        <Flag size={14} />
                        {readableDate(t.data.endsOn)}
                      </span>
                      <span>
                        <Link2 size={14} />
                        {t.data.dependencies.length}
                      </span>
                    </div>
                    {writable && (
                      <select
                        aria-label={`Move ${t.data.title}`}
                        value={status}
                        onChange={(e) => void move(t.id, e.target.value)}
                      >
                        <option value={status}>{label(status)}</option>
                        {(status === "BACKLOG"
                          ? ["IN_PROGRESS", "BLOCKED"]
                          : status === "IN_PROGRESS"
                            ? ["BLOCKED", "DONE"]
                            : ["IN_PROGRESS"]
                        ).map((st) => (
                          <option key={st} value={st}>
                            {label(st)}
                          </option>
                        ))}
                      </select>
                    )}
                  </article>
                ))}
            </section>
          ))}
        </div>
      )}
      {view === "register" && (
        <AdvancedRegister kind="task" people={people} hideHeading />
      )}
      {(adding || editing) && (
        <Modal
          title={editing ? "Edit work item" : "New work item"}
          close={() => {
            setAdding(false);
            setEditing(null);
          }}
        >
          <AdvancedForm
            kind="task"
            people={people}
            initial={editing || undefined}
            close={() => {
              setAdding(false);
              setEditing(null);
            }}
          />
        </Modal>
      )}
    </>
  );
}
