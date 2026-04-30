# ToDo App

A minimal personal todo product, deliberately small. Also serves as the canonical AINE BMAD training reference — every architectural decision is documented as a refusal of something larger. See the planning artifacts at `_bmad-output/planning-artifacts/` for the full context.

## Tech stack (locked)

- **TypeScript** end-to-end with `strict: true`
- **React Router 7** (Framework Mode) on Vite
- **Drizzle ORM** + **Postgres 17** (in-container)
- **postgres.js** as the Postgres driver
- **Zod** for validation (server + client)
- **pino** for structured JSON logging to stdout
- **Vanilla CSS Modules** + a 26-token vintage-Macintosh-System-7 design system
- **Vitest** + **@testing-library/react** for unit + integration tests
- **Docker Compose** for the production-shape stack
- **pnpm** for package management

No Tailwind. No styled-components. No state management library. No third-party logging or analytics SDK. Each refusal is documented in `_bmad-output/planning-artifacts/architecture.md`.

## Development

Prerequisites: Node 22 LTS (or 24), pnpm, and Docker (for the local Postgres container).

```bash
# Install dependencies
pnpm install

# Start a local Postgres 17 container (one-time)
docker run -d --name todo-app-pg-dev \
  -e POSTGRES_USER=todo -e POSTGRES_PASSWORD=todo -e POSTGRES_DB=todo \
  -p 5432:5432 postgres:17-alpine

# Copy the env template
cp .env.example .env

# Apply migrations
pnpm db:migrate

# Run the dev server (Vite + RR7 HMR)
pnpm dev
```

The app is available at `http://localhost:5173`.

## Tests

```bash
pnpm typecheck     # TypeScript strict-mode check
pnpm test          # Vitest run (unit + integration; integration tests skip if DATABASE_URL is unset)
pnpm check:gap-i1  # Static enforcement: services consume ctx.ownerId, never ctx.principal.browserKey
```

## Production build (Docker Compose)

`docker compose up` brings up the full stack — web + Postgres — with health checks and zero manual setup:

```bash
docker compose up --build -d
```

The web service is reachable at `http://localhost:3000`. Migrations run automatically on container startup (idempotently). Logs are pino-structured JSON to stdout — pipe to any aggregator without parsing prose.

```bash
docker compose logs -f web   # follow the web container's logs
docker compose ps             # check service health
docker compose down           # stop the stack (data persists in named volume)
docker compose down -v        # stop and clear the database volume
```

## Deployment

**v1 is local-first / private-URL by default. Public-internet exposure is out of scope and an unacceptable risk profile per the Project Principles.** This app has no authentication — todos are scoped per browser via an opaque local key, which is an *identity proxy*, not a security boundary. Anyone who can reach the URL can create todos under their own browser key; if their browser key happens to collide with someone else's (a 1-in-2^122 event for UUIDv4), they'd see each other's lists.

The "right" deployment posture for v1:

- A laptop running `docker compose up`
- A homelab server reachable on the LAN
- A box behind a VPN (WireGuard, Tailscale tailnet, OpenVPN)
- A workstation reached via SSH port-forward

The "wrong" deployment posture for v1:

- A public-internet URL with no auth in front
- A cloud VM with port 3000 open to `0.0.0.0`
- Anything indexable by Google or Shodan

If you need a real authenticated multi-user todo product, fork this repo and implement an auth module behind the four architectural seams (browser-key utility → request-context → ownership-check → service-layer). The seams are designed to absorb that change with minimal blast radius — that's their whole point. But until that work is done, **don't expose v1 publicly**.

### Optional: TLS termination via reverse proxy

The `docker-compose.yaml` includes a commented-out `proxy` service example using Caddy. Uncomment and configure for HTTPS termination at deploy time. **Adding the proxy publishes the app to the network** — use a private network, VPN, or Tailscale tailnet, **never `0.0.0.0`**.

When the proxy serves over HTTPS, set `HTTPS_ENABLED=true` in the web service's environment so the `Strict-Transport-Security` header gets sent.

## Project structure

```
todo-app/
├── app/
│   ├── components/      # AppShell, Checkbox, Toast, ListItem, etc. — co-located CSS Modules + tests
│   ├── lib/             # browser-key, logger, optimistic-store, env, validation, mutation-flows, with-logging, toast-store
│   ├── middleware/      # request-context (Gap I-1 semantic naming), ownership-check stub, security-headers
│   ├── routes/          # home (index loader), api.todos (POST), api.todos.$id (PATCH/DELETE)
│   ├── services/        # todos service-layer (listTodos, createTodo, toggleComplete, deleteTodo)
│   ├── styles/          # tokens.css (26 AA-verified tokens), reset.css, global.css
│   └── types/           # Todo, Envelope, MutationStatus
├── db/
│   ├── schema.ts        # Drizzle schema (todos table, nullable owner_id seam)
│   ├── client.ts        # Postgres connection
│   ├── migrate.mjs      # Programmatic migrator (runs on container startup)
│   └── migrations/      # drizzle-kit generated SQL
├── docs/
│   └── keyboard-walkthrough.md   # Manual WCAG 2.1 AA verification
├── scripts/
│   └── check-gap-i1.sh  # CI grep enforcement
├── docker-compose.yaml
├── Dockerfile
├── drizzle.config.ts
└── vitest.config.ts
```

For the full BMAD planning artifact set (PRD, Architecture, UX Design, Epics & Stories, Test Design, Implementation Readiness Report), see `../_bmad-output/planning-artifacts/`.
