/**
 * CLI entry for syncing the Up data warehouse.
 *
 *   npm run sync           # incremental (last 30 days)
 *   npm run sync -- --full # full backfill of all history
 *
 * Run this while the Next.js server is stopped — DuckDB allows only one read-write
 * process. While the server is running, sync via `POST /api/sync` instead.
 */
import { runSync } from "../lib/sync/sync";

// Load UP_TOKEN (and friends) from .env.local for standalone CLI runs.
try {
  (process as NodeJS.Process & { loadEnvFile: (p: string) => void }).loadEnvFile(".env.local");
} catch {
  // .env.local is optional if the vars are already in the environment.
}

const full = process.argv.includes("--full");

runSync(full ? "full" : "incremental")
  .then((result) => {
    if (result.status === "error") {
      console.error(`\n✗ Sync failed: ${result.error}`);
      process.exit(1);
    }
    console.log(
      `\n✓ ${result.kind} sync complete in ${(result.durationMs / 1000).toFixed(1)}s\n` +
        `  accounts:     ${result.accounts}\n` +
        `  categories:   ${result.categories}\n` +
        `  tags:         ${result.tags}\n` +
        `  transactions: ${result.transactions}\n` +
        `  attachments:  ${result.attachments}`,
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
