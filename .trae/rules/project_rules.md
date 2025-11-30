# Project Rules: Finance Parser

## Stack and Commands

- Use React 19 + TypeScript + Vite; Tailwind CSS 4 for styling.
- Primary commands: `npm run dev`, `npm run build`, `npm run lint`, `npm run preview`.
- Keep scripts simple and fast; avoid adding global CLIs.

## UI and Shadcn Usage

- Prefer components under `src/components/ui/*` for all interactive UI (button, input, select, table, dialog, dropdown-menu, card, collapsible, textarea).
- Do not introduce another UI library; extend existing shadcn-style primitives.
- Compose new UI with these primitives and Tailwind utility classes; keep variants handled via `class-variance-authority` when needed.
- Use `cn` from `src/lib/utils.ts` for class merging.
- Import via path aliases defined in Vite: `@/components/ui/*`, `@/components/*`.

## Styling and Theming

- Tailwind v4 is configured in `src/index.css`; keep tokens consistent with existing CSS variables.
- Respect light/dark theming using provided variables and `dark` variant.
- Avoid inline styles except for dynamic values that Tailwind cannot express.

## Components and Props

- Keep components small, composable, and typed with explicit prop interfaces.
- Use controlled inputs; avoid local mutable DOM state unless necessary.
- Accessibility first: label inputs with `Label`, ensure focus outlines, keyboard triggers, and ARIA attributes provided by Radix remain intact.

## Data Access

- Never talk to Supabase directly from pages/components; use functions in `src/lib/api.ts` for CRUD.
- Add new API helpers here with strict `interface` types and minimal coupling.
- Keep optimistic UI and sequential updates predictable; prefer server timestamps handled in API helpers.

## Gemini / LLM Usage

- Calls to Gemini must construct clear, deterministic prompts and expect JSON-only responses.
- Parse responses defensively (extract JSON block, validate shape) and surface errors via `AlertDialog`.
- If CORS or key exposure becomes a concern, route calls through Supabase Edge Functions (`supabase/functions/gemini-proxy`).
- Do not log or persist API keys; load from env: `VITE_GEMINI_API_KEY` in `.env.local`.

## Routing and State

- Use `react-router-dom` with routes in `src/App.tsx`.
- Share period selection via `useTimePeriod` and append `?month=..&year=..` when navigating.

## Structure and Aliases

- Keep new pages under `src/pages`, composite components under `src/components`, hooks in `src/hooks`, utilities in `src/lib`.
- Use `@` alias for `src/*` imports; no relative deep paths.

## Error Handling

- Use `useAlertDialog` + `AlertDialog` for user-visible errors and success messages.
- Use `useConfirmDialog` + `ConfirmDialog` for destructive actions.

## Performance

- Avoid unnecessary re-renders by lifting state and memoizing where appropriate; keep lists virtualized only if they become large.
- Prefer batched updates via helper functions; Supabase bulk operations are limited—sequence updates thoughtfully.

## Testing and Validation

- Lint before commit: `npm run lint`.
- Typecheck via build: `npm run build` ensures TS is valid (`tsc -b`).
- For interactive flows, validate in the browser; ensure parsing → save → dashboard works end-to-end.

## Security and Secrets

- Do not commit secrets; load `VITE_*` vars from `.env.local`.
- Replace hard-coded Supabase keys with env variables when feasible.

## Code Style

- TypeScript strict mode; avoid `any` except for third-party payloads; narrow quickly.
- No commented-out code; keep diffs focused and readable.
- Use parallel structure in UI and consistent naming (`StatementListPage`, `StatementDetailPage`, etc.).

## When Adding UI

- First check for an existing primitive in `src/components/ui/*`.
- If missing, create a new primitive following shadcn patterns (Radix, Tailwind, `cn`, optional `cva` variants) and reuse across pages.
