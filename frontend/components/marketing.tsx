import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  HardHat,
  Boxes,
  Wallet,
  ClipboardCheck,
  Users,
  GitBranch,
  ShieldCheck,
  ChevronRight,
  Check,
  Building2,
  MapPin,
  LayoutDashboard,
  FileText,
  CircleCheck,
} from "lucide-react";
import "./marketing.css";
function Brand() {
  return (
    <Link className="sc-brand" href="/" aria-label="Sitecraft home">
      <span>
        <HardHat size={23} aria-hidden="true" />
      </span>
      sitecraft<span className="sc-brand-dot">.</span>
    </Link>
  );
}
function ProjectPreview() {
  return (
    <figure
      className="sc-project-preview"
      aria-label="Example Sitecraft project dashboard with sample data"
    >
      <div className="sc-preview-top">
        <span>
          <HardHat size={17} /> sitecraft.
        </span>
        <span>EXAMPLE DASHBOARD</span>
        <span className="sc-preview-avatar">SC</span>
      </div>
      <div className="sc-preview-body">
        <aside>
          <LayoutDashboard />
          <Building2 />
          <Boxes />
          <Users />
          <FileText />
        </aside>
        <div className="sc-preview-content">
          <div className="sc-preview-heading">
            <div>
              <span>YOUR PROJECT, AT A GLANCE</span>
              <h3>Project overview</h3>
            </div>
            <span className="sc-preview-tag">Sample project</span>
          </div>
          <div className="sc-project-banner">
            <div>
              <span>EXAMPLE PROJECT / SC-001</span>
              <h4>Riverside Residence</h4>
              <p>
                <MapPin size={11} /> Example site · Bangladesh
              </p>
            </div>
            <div className="sc-completion">
              <strong>
                64<span>%</span>
              </strong>
              <span>Work progress</span>
            </div>
          </div>
          <div className="sc-preview-stats">
            {[
              ["Approved budget", "৳ 12.0m"],
              ["Actual cost", "৳ 7.2m"],
              ["On site today", "38 people"],
            ].map(([a, b]) => (
              <div key={a}>
                <span>{a}</span>
                <strong>{b}</strong>
              </div>
            ))}
          </div>
          <div className="sc-preview-panels">
            <div className="sc-preview-chart">
              <h4>Budget vs. actual</h4>
              <span className="sc-chart-legend">
                <i /> Budget <i /> Actual
              </span>
              <div className="sc-chart-bars">
                {[65, 90, 45, 72, 55].map((n, i) => (
                  <div key={i}>
                    <div>
                      <i style={{ height: `${n}%` }} />
                      <i style={{ height: `${n * 0.72}%` }} />
                    </div>
                    <span>
                      {["Civil", "Steel", "Labor", "MEP", "Other"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="sc-preview-progress">
              <h4>Work progress</h4>
              {[
                ["Foundation", 100],
                ["Structure", 76],
                ["Finishing", 22],
              ].map(([a, n]) => (
                <div key={a}>
                  <span>
                    {a}
                    <b>{n}%</b>
                  </span>
                  <div>
                    <i style={{ width: `${n}%` }} />
                  </div>
                </div>
              ))}
              <span className="sc-preview-update">
                <CircleCheck size={13} /> Progress recorded
              </span>
            </div>
          </div>
        </div>
      </div>
      <figcaption>
        Illustrative project and sample values. Not customer data.
      </figcaption>
    </figure>
  );
}
const features = [
  {
    icon: Wallet,
    title: "Keep costs in sight.",
    text: "Connect approved budgets, ledger-backed actuals and earned-value indicators in the project control room.",
    tag: "COST & CONTROL",
  },
  {
    icon: Boxes,
    title: "Know what’s on site.",
    text: "Follow materials from requisition to receipt, issue, return and transfer. See stock balances and low-stock items.",
    tag: "MATERIALS & PROCUREMENT",
  },
  {
    icon: Users,
    title: "Bring the people together.",
    text: "Manage workers, attendance and wages alongside contractors, work orders and bills.",
    tag: "PEOPLE & COMMERCIAL",
  },
  {
    icon: ClipboardCheck,
    title: "Make progress visible.",
    text: "Track BOQ progress, record site updates and manage documents, RFIs and risks in the same workspace.",
    tag: "PROGRESS & RECORDS",
  },
];
export function Marketing() {
  return (
    <div className="sc-marketing">
      <a className="sc-skip" href="#sc-main">
        Skip to content
      </a>
      <header className="sc-header">
        <nav className="sc-nav" aria-label="Main navigation">
          <Brand />
          <div className="sc-nav-links">
            <a href="#platform">Platform</a>
            <a href="#how-it-works">How it works</a>
            <a href="#questions">FAQ</a>
          </div>
          <div className="sc-nav-actions">
            <Link href="/control">Login</Link>
            <Link className="sc-button sc-button-small" href="/control">
              Get started <ArrowUpRight size={15} />
            </Link>
          </div>
        </nav>
      </header>
      <main id="sc-main">
        <section className="sc-hero">
          <div className="sc-hero-copy">
            <span className="sc-kicker">
              <i /> CONSTRUCTION, CONNECTED.
            </span>
            <h1>
              Build with
              <br />a clearer
              <br />
              <span>picture.</span>
            </h1>
            <p>
              From the site to the office, bring your people, materials,
              progress and costs into one connected project workspace.
            </p>
            <div className="sc-actions">
              <Link href="/control" className="sc-button">
                Get started <ArrowRight size={17} />
              </Link>
              <a href="#showcase" className="sc-text-link">
                Take a closer look <ArrowUpRight size={17} />
              </a>
            </div>
            <span className="sc-access-note">
              <ShieldCheck size={14} /> Access provided by your company
              administrator.
            </span>
          </div>
          <div className="sc-hero-visual">
            <div className="sc-drawing" aria-hidden="true">
              <span className="sc-drawing-label">
                PROJECT CLARITY / FROM THE GROUND UP
              </span>
              <svg viewBox="0 0 600 390" fill="none">
                <defs>
                  <pattern
                    id="sc-windows"
                    width="38"
                    height="32"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M7 4h22v20H7z"
                      stroke="currentColor"
                      strokeWidth=".6"
                    />
                  </pattern>
                </defs>
                <g stroke="currentColor">
                  <path d="M40 333 310 380 568 289M105 319V156l144 22v165M249 178l101-59v218M105 156l101-57 144 20M206 99v224M286 337V64l123 23v224M409 87l80-46v248M286 64l80-46 123 23M366 18v286" />
                  <path
                    d="M105 156v163l144 24V178zM286 64v273l123-26V87z"
                    fill="url(#sc-windows)"
                  />
                  <path
                    d="m249 210 101-58m-101 90 101-58m-101 90 101-58m-101 90 101-58M409 122l80-46m-80 81 80-46m-80 81 80-46m-80 81 80-46m-80 81 80-46M60 345V115m-8 0h16m-16 230h16M290 8h210M510 40v250m-7-250h14m-14 250h14"
                    strokeWidth=".6"
                  />
                  <path
                    d="M65 78h162M146 78v50M85 78l61-45 64 45M146 33v-8M89 78v32m-6 0h12m51-32v255"
                    strokeWidth="1.5"
                  />
                </g>
              </svg>
              <span className="sc-drawing-scale">
                SC / BUILD WITH PERSPECTIVE
              </span>
            </div>
            <div className="sc-floating-card">
              <span>
                <ClipboardCheck size={19} />
              </span>
              <div>
                <strong>Every detail. Connected.</strong>
                <p>Scope → Site → Cost</p>
              </div>
              <ArrowUpRight size={19} />
            </div>
            <span className="sc-visual-caption">
              PURPOSE-BUILT FOR CONSTRUCTION IN BANGLADESH
            </span>
          </div>
        </section>
        <div className="sc-discipline-strip">
          <span>
            ONE WORKSPACE.
            <br />
            <strong>THE WHOLE PROJECT.</strong>
          </span>
          {[
            { icon: Building2, label: "Projects" },
            { icon: Boxes, label: "Materials" },
            { icon: HardHat, label: "People" },
            { icon: GitBranch, label: "Planning" },
            { icon: Wallet, label: "Costs" },
          ].map(({ icon: Icon, label }) => (
            <span key={label}>
              <Icon size={20} />
              {label}
            </span>
          ))}
        </div>
        <section id="platform" className="sc-section">
          <div className="sc-section-heading">
            <div>
              <span className="sc-kicker">01 / A STRONGER FOUNDATION</span>
              <h2>
                Less chasing updates.
                <br />
                More moving forward.
              </h2>
            </div>
            <p>
              The details that keep a project moving belong together. Give your
              team a clearer view of the work, from the first requisition to the
              latest progress report.
            </p>
          </div>
          <div className="sc-feature-grid">
            {features.map(({ icon: Icon, title, text, tag }, i) => (
              <article key={title}>
                <div className="sc-feature-top">
                  <Icon size={25} />
                  <span>0{i + 1}</span>
                </div>
                <span className="sc-card-tag">{tag}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="showcase" className="sc-showcase">
          <div className="sc-showcase-inner">
            <div className="sc-section-heading">
              <div>
                <span className="sc-kicker">
                  02 / FROM THE SITE TO THE BIG PICTURE
                </span>
                <h2>
                  Your project.
                  <br />
                  At a glance.
                </h2>
              </div>
              <div>
                <p>
                  A familiar workspace for the daily details, with the
                  perspective you need to see what comes next.
                </p>
                <a className="sc-text-link" href="/control">
                  Open your workspace <ArrowUpRight size={17} />
                </a>
              </div>
            </div>
            <ProjectPreview />
            <div className="sc-showcase-notes">
              <span>
                <Check size={16} /> Budget vs. actual costs
              </span>
              <span>
                <Check size={16} /> BOQ-linked work progress
              </span>
              <span>
                <Check size={16} /> Project-level access
              </span>
            </div>
          </div>
        </section>
        <section id="how-it-works" className="sc-section">
          <div className="sc-section-heading">
            <div>
              <span className="sc-kicker">03 / BUILT AROUND THE WORK</span>
              <h2>
                Set the plan.
                <br />
                Connect the site.
              </h2>
            </div>
            <p>
              A practical workflow that brings project setup, day-to-day records
              and management decisions together.
            </p>
          </div>
          <ol className="sc-steps">
            {[
              [
                "Lay the groundwork",
                "Set up your project, sites, BOQ and budgets. Bring your team in with the right project permissions.",
              ],
              [
                "Capture the daily detail",
                "Record material movements, attendance, bills and physical progress as the work moves forward.",
              ],
              [
                "Review. Approve. Keep moving.",
                "Follow approvals, review costs and progress, and use project reports to inform your next decision.",
              ],
            ].map(([a, b], i) => (
              <li key={a}>
                <span>0{i + 1}</span>
                <h3>{a}</h3>
                <p>{b}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="sc-people">
          <div className="sc-people-inner">
            <div>
              <span className="sc-kicker">ONE PROJECT. MANY PERSPECTIVES.</span>
              <h2>
                For the people
                <br />
                who make it happen.
              </h2>
              <p>
                Keep site work and office decisions connected through a shared
                project record.
              </p>
            </div>
            <div className="sc-personas">
              {[
                [
                  "Project managers",
                  "See progress, commitments and cost exposure in the project control room.",
                ],
                [
                  "Site & store teams",
                  "Record daily activity and material movements with the project context attached.",
                ],
                [
                  "Commercial & company teams",
                  "Review budgets, contractor bills, approvals and reports across the work.",
                ],
              ].map(([a, b]) => (
                <article key={a}>
                  <HardHat size={20} />
                  <div>
                    <h3>{a}</h3>
                    <p>{b}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section id="questions" className="sc-section sc-faq">
          <div>
            <span className="sc-kicker">BEFORE YOU BREAK GROUND</span>
            <h2>A few useful details.</h2>
          </div>
          <div>
            {[
              [
                "How do I get access?",
                "Sign in with the account provided by your company administrator. Sitecraft uses company and project permissions; there is no public self-service signup.",
              ],
              [
                "Is this built for Bangladesh?",
                "Yes. The platform is designed for construction operations in Bangladesh, including local-currency costs, workers, wages and site materials.",
              ],
              [
                "What can I track?",
                "Projects, BOQ, budgets, materials, procurement, attendance, wages, contractors, bills, work progress, documents, planning, risks and RFIs are part of the workspace.",
              ],
              [
                "Can different team members have different access?",
                "Yes. Company roles and project-level permissions determine which records and workflows each person can access.",
              ],
            ].map(([a, b]) => (
              <details key={a}>
                <summary>
                  {a}
                  <ChevronRight size={18} />
                </summary>
                <p>{b}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="sc-final">
          <div>
            <span className="sc-kicker">A CLEARER VIEW. A STRONGER BUILD.</span>
            <h2>
              Bring your next
              <br />
              project together.
            </h2>
            <p>Your people. Your materials. Your progress. Connected.</p>
          </div>
          <div>
            <Link href="/control" className="sc-button sc-button-lime">
              Get started <ArrowUpRight size={19} />
            </Link>
            <span>Have an account? Your workspace is ready.</span>
          </div>
        </section>
      </main>
      <footer className="sc-footer">
        <div>
          <Brand />
          <p>
            Construction, connected.
            <br />
            Made for the builders of Bangladesh.
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <a href="#platform">Platform</a>
          <a href="#how-it-works">How it works</a>
          <a href="#questions">FAQ</a>
          <Link href="/control">
            Login <ArrowUpRight size={14} />
          </Link>
        </nav>
        <div className="sc-footer-bottom">
          <span>Sitecraft · Construction project management</span>
          <span>From foundation to handover.</span>
        </div>
      </footer>
    </div>
  );
}
