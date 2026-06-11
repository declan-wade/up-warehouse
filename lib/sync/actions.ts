"use server";

import { runSync, latestSyncRun, type SyncKind, type SyncResult, type SyncRunRow } from "./sync";

/**
 * Server Actions for the web UI. These run on the server and are invoked directly
 * from client components over Next.js's built-in (same-origin, CSRF-protected) action
 * channel — so the in-app "Sync now" button never needs SYNC_SECRET. That secret only
 * guards the public POST /api/sync HTTP endpoint used by external callers (e.g. cron).
 */

export async function triggerSync(kind: SyncKind): Promise<SyncResult> {
  return runSync(kind);
}

export async function fetchSyncStatus(): Promise<SyncRunRow | null> {
  return latestSyncRun();
}
