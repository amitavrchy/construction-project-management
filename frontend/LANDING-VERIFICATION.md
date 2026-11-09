# Landing page verification — 2026-11-09

- `npm run build`: passed; `/` is `○ (Static)` and `/robots.txt` is static.
- `npm run typecheck`: passed.
- `npm run test:marketing`: 7 passed. Checks the 90% content rail at all four requested widths, no horizontal scrolling or JavaScript errors, no API requests, keyboard FAQ controls, visible HTML with JavaScript disabled, social metadata/image, live animation, pause/resume, live reduced-motion changes, and CTA navigation to the existing sign-in form (401 response stubbed; not an API integration test).
- Chromium screenshots reviewed at 360, 768, 1280 and 1920px, including reduced-motion rendering.
- Lighthouse 13.6.0, mobile defaults, production server: performance 99, accessibility 100, best practices 100, SEO 100. Local lab measurements, not deployed-site measurements.
- `npm run test:e2e`: attempted; existing suite could not start because its backend requires `REDIS_URL`. Full authenticated workflows were not verified.
- No lint script exists. Repository-wide `npm run format:check` still reports pre-existing formatting issues in 40 files; the new marketing files and edited route/layout files pass focused Prettier checks.

## Deployment and routing

The public page renders without private workspace providers. The workspace provider and loading boundary now live under `[section]`, so `/` is immediately visible without hydration. `/control` retains the existing company sign-in and project control room. Workspace navigation and existing browser-test entry points now use `/control`.

No backend code, API proxy configuration, `netlify.toml`, or API environment variable behavior changed. Netlify's built-in `URL` determines the Open Graph image origin at build time; local builds fall back to localhost. No deployment was performed.

The design preserves forest green/lime branding and DM Sans/Manrope. Font assets are locally hosted WOFF2 subsets with their OFL licenses, avoiding the old render-blocking Google Fonts import. Dashboard values and the illustrative project are explicitly labeled as sample content. Company-admin access is stated; no signup or pricing was invented.

## Motion and width update

All primary content rails use 90% of the viewport. The hero has a composited blueprint reveal, a surveying beam and a floating project card. Viewport-triggered reveals and dashboard bar animations use a small IntersectionObserver/Web Animations component. Content remains visible without JavaScript. A Pause motion control and live reduced-motion handling stop motion. The earlier continuously repainted SVG stroke animation was replaced after the performance audit. No animation dependency was added.
