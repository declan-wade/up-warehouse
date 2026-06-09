import { EmptyState } from "@/components/EmptyState";
import { formatAud } from "@/lib/money";
import { getAccounts, getTotalBalance, hasData } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  TRANSACTIONAL: "Spending",
  SAVER: "Saver",
  HOME_LOAN: "Home loan",
};

export default async function AccountsPage() {
  if (!(await hasData())) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
        <EmptyState />
      </div>
    );
  }

  const [accounts, total] = await Promise.all([getAccounts(), getTotalBalance()]);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
        <div className="text-right">
          <div className="text-sm text-zinc-500">Total</div>
          <div className="text-xl font-semibold tabular-nums">{formatAud(total)}</div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((a) => (
          <div key={a.id} className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                {TYPE_LABELS[a.account_type] ?? a.account_type}
              </span>
              {a.ownership_type === "JOINT" && (
                <span className="text-xs text-zinc-400">Joint</span>
              )}
            </div>
            <div className="mt-3 truncate font-medium text-zinc-900">{a.display_name}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{formatAud(a.balance)}</div>
            {a.created_at && (
              <div className="mt-2 text-xs text-zinc-400">Opened {a.created_at}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
