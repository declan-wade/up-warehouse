import { NextResponse } from "next/server";
import { isSyncing, latestSyncRun, runSync, type SyncKind } from "@/lib/sync/sync";

// Writes happen at request time through the single shared DuckDB connection.
export const dynamic = "force-dynamic";

/**
 * Authorize a sync trigger. Same-origin browser requests (the "Sync now" button)
 * are always allowed. External callers (e.g. a cron job) must present SYNC_SECRET
 * via the `x-sync-secret` header when that env var is configured.
 */
function authorized(request: Request): boolean {
  const secret = process.env.SYNC_SECRET;
  if (request.headers.get("sec-fetch-site") === "same-origin") return true;
  if (!secret) return true; // no secret configured -> open (suitable for localhost)
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
