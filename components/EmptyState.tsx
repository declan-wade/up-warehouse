export function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center">
      <h2 className="text-lg font-semibold">No data yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
        Add your Up personal access token to <code className="rounded bg-zinc-100 px-1">.env.local</code> as{" "}
        <code className="rounded bg-zinc-100 px-1">UP_TOKEN</code>, then run{" "}
        <code className="rounded bg-zinc-100 px-1">npm run sync -- --full</code> (server stopped) or click{" "}
        <strong>Sync now</strong> above to backfill your transactions.
      </p>
      <p className="mt-3 text-xs text-zinc-400">
        Get a token at{" "}
        <a className="underline" href="https://api.up.com.au/getting_started" target="_blank" rel="noreferrer">
          api.up.com.au/getting_started
        </a>
        .
      </p>
    </div>
  );
}
