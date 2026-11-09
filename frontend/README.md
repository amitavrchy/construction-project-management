# Sitecraft frontend

Next.js 16 / React 19, with an independent lockfile and dependency installation. The workspace uses readable typography, responsive layouts, native accessible dialogs, keyboard controls and reduced-motion support.

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

The public homepage is a static marketing page. The existing company sign-in flow and control room are at `/control`; access is provided by a company administrator. Planning, budget versions, procurement, commercial control, approval inbox, risks, RFIs, site intelligence, notifications and approval policies are in the primary sidebar. `/overview` preserves the site summary. Ctrl/Cmd+K opens global search; record links select the correct register and open its detail dialog. Selected projects are remembered per signed-in user.

Multi-line forms show rate/quantity totals before submission. The execution board supports both drag/drop and select-based keyboard actions. The server is authoritative for permissions, deductions, inventory, workflow transitions and revision checks; UI visibility is not an access boundary.

`npm run test:marketing` checks the public page at 360, 768, 1280 and 1920px, static HTML without JavaScript, keyboard FAQ interaction and the sign-in link without requiring a backend. Netlify?s built-in `URL` sets the social-image origin at build time; local builds fall back to localhost.

## Browser verification

Build both applications and seed the backend first (see [setup](../backend/README.md)). Then:

```powershell
npm exec --prefix frontend -- playwright install chromium
npm run test:e2e --prefix frontend
```

Playwright starts/stops the compiled API and web server. Set `E2E_URL` to use an already running remote frontend. Use `SEED_PASSWORD` if the development seed uses a different password. Screenshots and traces stay inside ignored `frontend/artifacts` and `frontend/test-results`.

The app uses Google Fonts with local system fallbacks. Photo/PDF bodies are fetched from authorized API file routes on demand. No public deployment has been made.

## Render and Netlify readiness

For Netlify use package/base directory `frontend`, configuration `frontend/netlify.toml`, build `npm run build` and publish `.next` relative to the base. `API_URL` is a server-only build destination and must point to the ownership-verified HTTPS backend. The Next.js adapter handles hosting; standalone output is used only outside Netlify. Keep the same-origin `/api` proxy so Secure/HttpOnly/SameSite Lax production cookies work without cross-site cookie exceptions. The backend requires exact allowed Origins for every mutation.

Backend startup delays have explicit loading status and bounded requests. Private snapshots stay in memory; returning to the tab revalidates in the background. Password changes revoke sessions and return to sign-in. Failed writes are never retried or represented as confirmed success. Full instructions and environment names are in [deployment](../backend/docs/deployment.md), with [verification results](../backend/docs/verification.md).
