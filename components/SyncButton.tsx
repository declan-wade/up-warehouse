"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { triggerSync } from "@/lib/sync/actions";
import type { SyncRunRow } from "@/lib/sync/sync";

interface Status {
  status: string;
  finished_at: string | null;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "never";
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function SyncButton({ initialStatus }: { initialStatus: SyncRunRow | null }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(
    initialStatus ? { status: initialStatus.status, finished_at: initialStatus.finished_at } : null,
  );
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function sync(kind: "incremental" | "full") {
    setBusy(true);
    try {
      // Calls the server-side function directly — no fetch, no auth header.
      const result = await triggerSync(kind);
      setStatus({ status: result.status, finished_at: new Date().toISOString() });
      if (result.status === "error") {
        alert(`Sync failed: ${result.error ?? "unknown error"}`);
      } else {
        startTransition(() => router.refresh());
      }
    } catch (e) {
      alert(`Sync request failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  const last =
    status?.status === "error"
      ? "last sync failed"
      : status
        ? `synced ${timeAgo(status.finished_at)}`
        : "not synced yet";

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={`hidden sm:inline ${status?.status === "error" ? "text-rose-600" : "text-zinc-500"}`}>
        {last}
      </span>
      <button
        onClick={() => sync("incremental")}
        disabled={busy}
        className="rounded-md bg-zinc-900 px-3 py-1.5 font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
        title="Sync the last 30 days"
      >
        {busy ? "Syncing…" : "Sync now"}
      </button>
      <button
        onClick={() => sync("full")}
        disabled={busy}
        className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50"
        title="Backfill all history"
      >
        Full
      </button>
    </div>
  );
}
