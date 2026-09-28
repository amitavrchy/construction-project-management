import { planning } from "./modules-planning";
import { materials } from "./modules-materials";
import { labor } from "./modules-labor";
import { contracts } from "./modules-contracts";
export const modules = { ...planning, ...materials, ...labor, ...contracts };
export const navigation = [
  {
    label: "PROJECT CONTROL",
    items: [
      ["control", "Control room", "Radar"],
      ["planning", "Planning & WBS", "CalendarRange"],
      ["approvals", "Approval inbox", "CheckCheck"],
      ["procurement", "Procurement", "ShoppingCart"],
      ["commercial", "Commercial control", "Landmark"],
      ["budget-versions", "Budget versions", "Layers3"],
      ["risks", "Risk register", "ShieldAlert"],
      ["rfis", "Design & RFIs", "MessagesSquare"],
      ["site-diary", "Site intelligence", "NotebookPen"],
      ["activity", "Activity & alerts", "Bell"],
      ["automation", "Approval policies", "Workflow"],
    ],
  },
  {
    label: "WORKSPACE",
    items: [
      ["dashboard", "Overview", "LayoutDashboard"],
      ["projects", "Projects", "Building2"],
    ],
  },
  {
    label: "PLAN & CONTROL",
    items: [
      ["boq", "Bill of quantities", "ListTree"],
      ["budget", "Budgets", "Wallet"],
      ["variation", "Variations", "GitPullRequest"],
    ],
  },
  {
    label: "SITE OPERATIONS",
    items: [
      ["stock", "Site stock", "Boxes"],
      ["requisition", "Requisitions", "ClipboardList"],
      ["receipt", "Goods received", "PackageCheck"],
      ["issue", "Material issues", "Truck"],
      ["return", "Returns", "Undo2"],
      ["transfer", "Transfers", "ArrowLeftRight"],
      ["material", "Materials", "Package"],
      ["supplier", "Suppliers", "Store"],
      ["attendance", "Attendance", "CalendarCheck"],
      ["worker", "Workers", "HardHat"],
      ["wage", "Wages & payroll", "Banknote"],
    ],
  },
  {
    label: "DELIVERY",
    items: [
      ["contractor", "Contractors", "Handshake"],
      ["workorder", "Work orders", "FileSignature"],
      ["bill", "Contractor bills", "Receipt"],
      ["progress", "Daily progress", "TrendingUp"],
      ["document", "Documents", "FolderOpen"],
      ["reports", "Reports", "ChartNoAxesCombined"],
    ],
  },
];
