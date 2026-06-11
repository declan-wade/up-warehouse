import { NextResponse } from "next/server";
import { isSyncing, latestSyncRun, runSync, type SyncKind } from "@/lib/sync/sync";

// Writes happen at request time through the single shared DuckDB connection.
export const dynamic = "force-dynamic";

/**
 * Authorize a sync trigger. This HTTP endpoint exists for external callers (e.g. a
 * cron job) — the in-app "Sync now" button uses a Server Action and never reaches here.
 * When SYNC_SECRET is configured, callers must present it via the `x-sync-secret` header;
 * otherwise the endpoint is open (suitable for localhost-only setups).
 */
function authorized(request: Request): boolean {
  const secret = process.env.SYNC_SECRET;
  if (!secret) return true;
  return request.headers.get("x-sync-secret") === secret;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kind: SyncKind =
    new URL(request.url).searchParams.get("kind") === "full" ? "full" : "incremental";

  const result = await runSync(kind);
  return NextResponse.json(result, { status: result.status === "error" ? 502 : 200 });
}

export async function GET() {
  const latest = await latestSyncRun();
  return NextResponse.json({ syncing: isSyncing(), latest });
}
