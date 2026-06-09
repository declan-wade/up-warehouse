import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { RangeTabs } from "@/components/RangeTabs";
import { CashflowChart } from "@/components/charts/CashflowChart";
import { CategoryChart } from "@/components/charts/CategoryChart";
import { formatAud } from "@/lib/money";
import { resolveRange } from "@/lib/range";
import {
  getMonthlyCashflow,
  getSpendByCategory,
  getSummary,
  getTopMerchants,
  getTotalBalance,
  hasData,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const populated = await hasData();
  if (!populated) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <EmptyState />
      </div>
    );
  }

  const r = resolveRange(range);
  const [balance, summary, cashflow, byCategory, merchants] = await Promise.all([
    getTotalBalance(),
    getSummary(r.from, r.to),
    getMonthlyCashflow(12),
    getSpendByCategory(r.from, r.to),
    getTopMerchants(r.from, r.to, 10),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-500">
            {r.from} → {r.to}
          </p>
        </div>
        <RangeTabs active={r.key} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total balance" amount={balance} tone="positive" />
        <KpiCard label="Income" amount={summary.income} tone="positive" sub={`${summary.txCount} transactions`} />
        <KpiCard label="Spent" amount={-summary.spent} tone="negative" />
        <KpiCard
          label="Net"
          amount={summary.net}
          tone={summary.net >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-medium text-zinc-700">Cashflow — last 12 months</h2>
          <CashflowChart data={cashflow} />
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-medium text-zinc-700">Spending by category</h2>
          {byCategory.length ? (
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
              <CategoryChart data={byCategory} />
              <ul className="space-y-1.5 text-sm">
                {byCategory.slice(0, 8).map((c) => (
                  <li key={c.category} className="flex justify-between gap-3">
                    <span className="truncate text-zinc-600">{c.category}</span>
                    <span className="tabular-nums text-zinc-900">{formatAud(c.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-zinc-400">No spending in this range.</p>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-medium text-zinc-700">Top merchants</h2>
        {merchants.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-400">
                <th className="pb-2 font-medium">Merchant</th>
                <th className="pb-2 text-right font-medium">Transactions</th>
                <th className="pb-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {merchants.map((m) => (
                <tr key={m.description} className="border-b border-zinc-50 last:border-0">
                  <td className="py-2 text-zinc-800">{m.description}</td>
                  <td className="py-2 text-right tabular-nums text-zinc-500">{m.count}</td>
                  <td className="py-2 text-right tabular-nums text-zinc-900">{formatAud(m.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="py-8 text-center text-sm text-zinc-400">No spending in this range.</p>
        )}
      </section>
    </div>
  );
}
