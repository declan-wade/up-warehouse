import { exec, query, queryOne } from "../db/duck";
import { UpClient } from "../up/client";
import {
  upsertAccount,
  upsertAttachment,
  upsertCategory,
  upsertTag,
  upsertTransaction,
} from "./upsert";

export type SyncKind = "full" | "incremental";

export interface SyncResult {
  id: number;
  kind: SyncKind;
  status: "success" | "error";
  accounts: number;
  categories: number;
  tags: number;
  transactions: number;
  attachments: number;
  durationMs: number;
  error?: string;
}

/** How far back an incremental sync re-fetches transactions (catches HELD->SETTLED changes). */
const INCREMENTAL_LOOKBACK_DAYS = 30;

// All writes share one DuckDB connection; never let two syncs interleave.
let inFlight: Promise<SyncResult> | null = null;

export function isSyncing(): boolean {
  return inFlight !== null;
}

export function runSync(kind: SyncKind = "incremental"): Promise<SyncResult> {
  if (inFlight) return inFlight;
  inFlight = doSync(kind).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doSync(kind: SyncKind): Promise<SyncResult> {
  const startedAt = Date.now();
  const up = new UpClient();

  const row = await queryOne<{ id: bigint | number }>(
    `INSERT INTO sync_runs (kind, status, started_at) VALUES (?, 'running', now()) RETURNING id`,
    [kind],
  );
  const id = Number(row!.id);

  const counts = { accounts: 0, categories: 0, tags: 0, transactions: 0, attachments: 0 };

  try {
    await up.ping();

    for await (const account of up.listAccounts()) {
      await upsertAccount(account);
      counts.accounts++;
    }

    for await (const category of up.listCategories()) {
      await upsertCategory(category);
      counts.categories++;
    }

    for await (const tag of up.listTags()) {
      await upsertTag(tag);
      counts.tags++;
    }

    const since =
      kind === "incremental"
        ? new Date(Date.now() - INCREMENTAL_LOOKBACK_DAYS * 86_400_000).toISOString()
        : undefined;
    for await (const tx of up.listTransactions({ since })) {
      await upsertTransaction(tx);
      counts.transactions++;
    }

    for await (const attachment of up.listAttachments()) {
      await upsertAttachment(attachment);
      counts.attachments++;
    }

    const durationMs = Date.now() - startedAt;
    await exec(
      `UPDATE sync_runs SET status = 'success', finished_at = now(),
         accounts_count = ?, categories_count = ?, tags_count = ?,
         transactions_upserted = ?, attachments_count = ?
       WHERE id = ?`,
      [counts.accounts, counts.categories, counts.tags, counts.transactions, counts.attachments, id],
    );

    return { id, kind, status: "success", ...counts, durationMs };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await exec(
      `UPDATE sync_runs SET status = 'error', finished_at = now(), error_message = ? WHERE id = ?`,
      [message.slice(0, 1000), id],
    );
    return { id, kind, status: "error", ...counts, durationMs: Date.now() - startedAt, error: message };
  }
}

export interface SyncRunRow {
  id: number;
  kind: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  transactions_upserted: number | null;
  accounts_count: number | null;
  error_message: string | null;
}

/** The most recent sync run, for the UI's status indicator. */
export async function latestSyncRun(): Promise<SyncRunRow | null> {
  return queryOne<SyncRunRow>(
    `SELECT CAST(id AS INTEGER) AS id, kind, status,
            strftime(started_at, '%Y-%m-%dT%H:%M:%SZ') AS started_at,
            strftime(finished_at, '%Y-%m-%dT%H:%M:%SZ') AS finished_at,
            CAST(transactions_upserted AS INTEGER) AS transactions_upserted,
            CAST(accounts_count AS INTEGER) AS accounts_count,
            error_message
     FROM sync_runs ORDER BY id DESC LIMIT 1`,
  );
}
