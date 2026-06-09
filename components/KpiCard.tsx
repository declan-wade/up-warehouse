import { formatAud } from "@/lib/money";

export function KpiCard({
  label,
  amount,
  tone = "neutral",
  sub,
}: {
  label: string;
  amount: number;
  tone?: "neutral" | "positive" | "negative";
  sub?: string;
}) {
  const toneClass =
    tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-rose-600" : "text-zinc-900";
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>{formatAud(amount)}</div>
      {sub && <div className="mt-1 text-xs text-zinc-400">{sub}</div>}
    </div>
  );
}

/** Money cell that colours positive vs negative amounts. */
export function Money({ amount }: { amount: number }) {
  return (
    <span className={`tabular-nums ${amount < 0 ? "text-zinc-900" : "text-emerald-600"}`}>
      {formatAud(amount)}
    </span>
  );
}
