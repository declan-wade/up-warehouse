# syntax=docker/dockerfile:1

# ---- Base ---------------------------------------------------------------------
# Debian (glibc) — DuckDB's prebuilt native bindings target glibc, so avoid Alpine/musl.
FROM node:22-bookworm-slim AS base
WORKDIR /app

# ---- Dependencies -------------------------------------------------------------
# Installed inside the container so the correct platform-specific DuckDB native
# binding (@duckdb/node-bindings-linux-<arch>) is fetched for the build platform.
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- Builder ------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Runner -------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Bind to all interfaces so the container is reachable, on the conventional port.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Next.js standalone server (server.js + traced node_modules).
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Schema is read from disk at runtime (process.cwd()/lib/db/schema.sql), and the
# native DuckDB packages are copied explicitly so the addon is always present.
COPY --from=builder /app/lib/db/schema.sql ./lib/db/schema.sql
COPY --from=builder /app/node_modules/@duckdb ./node_modules/@duckdb

# DuckDB writes its database file here; mount a host volume to persist it.
RUN mkdir -p /app/data && chown -R node:node /app/data /app/.next
VOLUME ["/app/data"]

USER node
EXPOSE 3000

# UP_TOKEN (and optional SYNC_SECRET) are supplied at runtime via -e / --env-file.
CMD ["node", "server.js"]
