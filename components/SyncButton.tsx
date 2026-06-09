"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface SyncStatus {
  syncing: boolean;
  latest: {
    status: string;
    kind: string;
    finished_at: string | null;
    transactions_upserted: number | null;
  } | null;
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

export function SyncButton() {
  const router = useRouter();
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [busy, setBusy] = useState(false);

  async function refreshStatus() {
    try {
      const res = await fetch("/api/sync", { cache: "no-store" });
      setStatus(await res.json());
    } catch {
      /* ignore transient errors */
    }
  }

  useEffect(() => {
    refreshStatus();
  }, []);

  async function sync(kind: "incremental" | "full") {
    setBusy(true);
    try {
      const res = await fetch(`/api/sync?kind=${kind}`, { method: "POST" });
      const result = await res.json();
      await refreshStatus();
      if (result.status !== "error") router.refresh();
      else alert(`Sync failed: ${result.error ?? "unknown error"}`);
    } catch (e) {
      alert(`Sync request failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  const latest = status?.latest;
  const last =
    latest?.status === "error"
      ? "last sync failed"
      : latest
        ? `synced ${timeAgo(latest.finished_at)}`
        : "not synced yet";

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={`hidden sm:inline ${latest?.status === "error" ? "text-rose-600" : "text-zinc-500"}`}>
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
