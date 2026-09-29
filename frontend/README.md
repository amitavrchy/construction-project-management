# Sitecraft frontend

Next.js 16 / React 19, with an independent lockfile and dependency installation. All text is at least 14px, with responsive layouts, native accessible dialogs, keyboard controls and reduced-motion support.

From the repository root:

```powershell
npm ci --prefix frontend
npm run dev --prefix frontend
```

The backend must run separately on port 4000. Open http://localhost:3000. The frontend proxies `/api` to `API_URL` (default http://localhost:4000). Set this value before a production build when changing the API address.

```powershell
npm run typecheck --prefix frontend
npm run build --prefix frontend
npm run start --prefix frontend
```

The start wrapper serves Next's standalone output and copies static assets into the standalone directory. It supports independent and legacy monorepo build layouts.

The homepage is the control room. Planning, budget versions, procurement, commercial control, approval inbox, risks, RFIs, site intelligence, notifications and approval policies are in the primary sidebar. `/overview` preserves the site summary. Ctrl/Cmd+K opens global search; record links select the correct register and open its detail dialog. Selected projects are remembered per signed-in user.

Multi-line forms show rate/quantity totals before submission. The execution board supports both drag/drop and select-based keyboard actions. The server is authoritative for permissions, deductions, inventory, workflow transitions and revision checks; UI visibility is not an access boundary.

## Browser verification

Build both applications and seed the backend first (see [setup](../backend/README.md)). Then:

```powershell
npm exec --prefix frontend -- playwright install chromium
npm run test:e2e --prefix frontend
```

Playwright starts/stops the compiled API and web server. Set `E2E_URL` to use an already running remote frontend. Use `SEED_PASSWORD` if the development seed uses a different password. Screenshots and traces stay inside ignored `frontend/artifacts` and `frontend/test-results`.

The app uses Google Fonts with local system fallbacks. Photo/PDF bodies are fetched from authorized API file routes on demand. No public deployment has been made.
