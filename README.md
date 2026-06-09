# Up Warehouse

A self-hosted data warehouse + analytics dashboard for your [Up Bank](https://up.com.au) data.
It pulls everything the [Up API](https://developer.up.com.au/) exposes — accounts, transactions,
categories, tags and attachments — into a local **DuckDB** database, then serves rich analytics
through a Next.js web UI. Your financial data never leaves your machine.

## Stack

- **Next.js 16** (App Router) + React 19 + Tailwind v4
- **DuckDB** (`@duckdb/node-api`) — embedded columnar OLAP engine, single file at `data/up.duckdb`
- **Recharts** for charts

## Setup

1. **Get an Up token.** Sign in at [api.up.com.au/getting_started](https://api.up.com.au/getting_started)
   and create a Personal Access Token.

2. **Configure `.env.local`** (already scaffolded):

   ```ini
   UP_TOKEN=up:yeah:your-token-here
   SYNC_SECRET=            # optional, for cron-triggered syncs
   ```

3. **Install + backfill.** The first sync pulls your entire transaction history. DuckDB allows only
   one read-write process, so run the backfill with the dev server **stopped**:

   ```bash
   npm install
   npm run sync -- --full      # full historical backfill
   ```

4. **Run the app:**

   ```bash
   npm run dev                 # http://localhost:3000
   ```

## Syncing data

| Command | What it does |
| --- | --- |
| `npm run sync` | Incremental sync — re-fetches the last 30 days (catches `HELD → SETTLED` changes, edits) |
| `npm run sync -- --full` | Full backfill of all history |
| **"Sync now"** button | Incremental sync via `POST /api/sync` (runs inside the server process) |
| **"Full"** button | Full backfill via `POST /api/sync?kind=full` |

**Important:** the CLI (`npm run sync`) opens the DuckDB file directly, so only run it while the dev/prod
server is stopped. While the server is running, sync through the buttons or the API endpoint instead —
all writes then go through the single server process.

### Scheduling incremental syncs (cron)

Because of the single-writer constraint, schedule syncs by calling the **running server's** endpoint
rather than launching a second process. Set `SYNC_SECRET` in `.env.local`, then:

```bash
# every hour, on the hour
0 * * * * curl -fsS -X POST -H "x-sync-secret: YOUR_SECRET" http://localhost:3000/api/sync >/dev/null
```

## Run with Docker

The app ships as a self-contained image (Next.js standalone output + the DuckDB native
addon). Debian-based (glibc) because DuckDB's prebuilt bindings target glibc, not musl.

**Configuration is entirely runtime** — no secrets are baked into the image:

- **Env vars** (`UP_TOKEN`, optional `SYNC_SECRET`) are passed with `-e` / `--env-file`.
- **The DuckDB file** lives at `/app/data/up.duckdb`; mount a host directory at `/app/data`
  to persist it across container restarts and rebuilds.

### Docker Compose (recommended)

`docker-compose.yml` wires up the env file and the data volume for you:

```bash
docker compose up --build -d          # build + start, reads .env.local, mounts ./data
curl -X POST "http://localhost:3000/api/sync?kind=full"   # one-time backfill
# open http://localhost:3000
```

### Plain Docker

```bash
docker build -t up-warehouse .

# Pass env vars and mount the data volume:
docker run -d --name up-warehouse \
  -p 3000:3000 \
  --env-file .env.local \
  -v "$(pwd)/data:/app/data" \
  up-warehouse

# ...or pass individual vars instead of --env-file:
#   -e UP_TOKEN=up:yeah:... -e SYNC_SECRET=...
```

### Syncing in a container

The production image runs the standalone **server** (not the `tsx` CLI), and DuckDB is
single-writer, so trigger syncs through the running container's API rather than `docker exec`:

```bash
curl -X POST "http://localhost:3000/api/sync?kind=full"        # backfill all history
curl -X POST "http://localhost:3000/api/sync"                  # incremental (last 30 days)
# with SYNC_SECRET set, add:  -H "x-sync-secret: YOUR_SECRET"
```

The same cron + `curl` recipe above schedules incremental syncs against the container.

> **Notes**
> - The container runs as the non-root `node` user (uid 1000). On Linux, ensure the mounted
>   `./data` directory is writable by that uid (`chown -R 1000:1000 data`) or it won't be able
>   to create the database file.
> - Building for a different CPU architecture (e.g. amd64 from an Apple-Silicon host):
>   `docker build --platform linux/amd64 -t up-warehouse .` — the correct DuckDB native binding
>   is fetched automatically for the target platform during the in-container `npm ci`.

## What's stored

Every resource keeps its full API payload in a `raw` JSON column, so no information is lost. Money is
stored as exact integer base units (cents) plus a derived dollar value. Tables: `accounts`,
`transactions`, `categories`, `tags`, `transaction_tags`, `attachments`, and `sync_runs` (sync history).

The DuckDB file lives at `data/up.duckdb` (gitignored). Query it directly any time:

```bash
duckdb data/up.duckdb "SELECT strftime(created_at,'%Y-%m') m, -SUM(amount) spent
  FROM transactions WHERE amount < 0 AND transfer_account_id IS NULL GROUP BY 1 ORDER BY 1"
```

## Pages

- **Dashboard** — balances, income/expense KPIs, 12-month cashflow, spending by category, top merchants (with a date-range selector).
- **Transactions** — searchable, filterable (account / category / tag / status / date), paginated explorer.
- **Accounts** — every account with its current balance.
