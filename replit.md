# إتقان سوفت — نظام نقطة المبيعات

نظام POS متكامل للمطاعم باللغة العربية مع واجهة كاشير، لوحة إدارة، طباعة فواتير مباشرة وفواتير أقسام.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/pos-system run dev` — run the frontend (port 20639)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, SQLite (better-sqlite3) — database auto-created at `artifacts/api-server/data/pos.db`
- Frontend: React 19, Vite, Tailwind CSS v4, shadcn/ui, TanStack Query, Wouter
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild

## Where things live

- `artifacts/api-server/src/routes/` — API route handlers
- `artifacts/api-server/src/lib/sqlite.ts` — DB schema, seed data, session auth
- `artifacts/pos-system/src/pages/pos.tsx` — main cashier POS screen
- `artifacts/pos-system/src/components/receipt.tsx` — receipt components (print area + preview)
- `artifacts/pos-system/src/pages/settings.tsx` — admin settings (printer setup)
- `artifacts/pos-system/src/index.css` — global styles including `@media print` receipt styles
- `lib/api-spec/openapi.yaml` — source of truth for API contract
- `lib/api-client-react/src/generated/` — generated React Query hooks (do NOT edit directly)

## Architecture decisions

- **SQLite not PostgreSQL**: Uses better-sqlite3 directly (not Drizzle/PG). DB auto-created and seeded at startup. The `@workspace/db` package (Drizzle/PG) exists but is unused by the API server.
- **In-memory sessions**: Auth tokens stored in a `Map<token, userId>` in memory — sessions reset on server restart.
- **Two-layer printing**: Main receipt via `window.print()` (browser handles paper size/dialog); department slips with a configured printer name go directly to backend `/api/printers/print` without any dialog.
- **Printer discovery**: Backend detects system printers via `lpstat` (Linux/Mac) or PowerShell (Windows). Admin can also type an IP address (e.g. `192.168.1.100`) for network thermal printers (ESC/POS over TCP port 9100).
- **Receipt print area**: A hidden `div.hidden-print-container` with `display:none` holds the formatted receipt HTML. On print, CSS `visibility` technique makes it the only visible content.

## Product

- **Cashier POS**: Add items to cart by clicking or typing product number + Enter. Set order type (محلي/سفري/توصيل), table number, discount, payment method, notes. Press "دفع" to create order, see receipt preview, then print.
- **Receipt printing**: Main invoice prints first (configured copies). Department slips print separately — each on its own page. Dept slips with a printer name go directly to that printer; all receipts also output via browser print.
- **Admin settings**: Business info, receipt format toggles, printer configuration per department. Printer dropdown auto-detects system/network printers.
- **Admin dashboard**: Sales summary, charts, product/category/user/customer management, reports.

## Default credentials

- Admin: `admin` / `admin123`
- Cashier: `cashier` / `cashier123`

## User preferences

- Interface language: Arabic (RTL)
- Receipt format: matches standard thermal receipt paper (80mm)
- Printing: direct to department printers without dialog where printer is configured

## Gotchas

- Run codegen after any changes to `lib/api-spec/openapi.yaml`: `pnpm --filter @workspace/api-spec run codegen`
- The `dev` script uses `NODE_ENV=development pnpm run build && pnpm run start` (builds then runs — not a watch mode server)
- Session tokens are in-memory only; restarting the API server logs everyone out
- For IP-based thermal printers, use format `192.168.1.100` or `192.168.1.100:9100` as the printer name in settings

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
