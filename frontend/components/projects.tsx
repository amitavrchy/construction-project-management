"use client";
import { useState } from "react";
import { Plus, MapPin, ArrowUpRight, Building2 } from "lucide-react";
import { useWorkspace } from "./provider";
import { Status } from "./status";
import { Modal } from "./modal";
import { RecordForm } from "./record-form";
import { readableDate } from "../lib/format";
import { Field } from "../lib/types";
import Link from "next/link";
const fields: Field[] = [
  { key: "name", label: "Project name" },
  { key: "code", label: "Project code" },
  { key: "address", label: "Location" },
  { key: "startsOn", label: "Start date", type: "date" },
  { key: "endsOn", label: "Target handover", type: "date" },
];
export function Projects() {
  const { projects, user, setProjectId, mutate } = useWorkspace();
  const [adding, setAdding] = useState(false);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">BUILD SOMETHING THAT LASTS</span>
          <h1>Your projects</h1>
          <p>Every site. Every milestone. One connected workspace.</p>
        </div>
        {user?.role === "COMPANY_ADMIN" && (
          <button className="button primary" onClick={() => setAdding(true)}>
            <Plus size={18} />
            New project
          </button>
        )}
      </div>
      <div className="projects-grid">
        {projects.map((p, i) => (
          <Link
            href="/"
            onClick={() => setProjectId(p.id)}
            key={p.id}
            className="project-card panel"
          >
            <div className={`project-art project-art-${i % 3}`}>
              <Building2 size={110} strokeWidth={0.7} />
              <span>{p.code}</span>
            </div>
            <div className="project-card-body">
              <Status value={p.status} />
              <h2>{p.name}</h2>
              <p>
                <MapPin size={16} />
                {p.address}
              </p>
              <div>
                <span>
                  {p.sites.length} sites · Due {readableDate(p.endsOn)}
                </span>
                <ArrowUpRight size={20} />
              </div>
            </div>
          </Link>
        ))}
      </div>
      {!projects.length && (
        <div className="empty panel">
          <Building2 size={36} />
          <h2>Your next project starts here</h2>
          <p>Create a project to begin planning your build.</p>
        </div>
      )}
      {adding && (
        <Modal title="Create a project" close={() => setAdding(false)}>
          <RecordForm
            fields={fields}
            close={() => setAdding(false)}
            onSubmit={(d) => mutate("projects", d)}
          />
        </Modal>
      )}
    </>
  );
}
