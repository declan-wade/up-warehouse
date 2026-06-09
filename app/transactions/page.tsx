import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { Filters } from "@/components/Filters";
import { Money } from "@/components/KpiCard";
import {
  getAccountRefs,
  getParentCategories,
  getTags,
  getTransactions,
  hasData,
  type TransactionFilters,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type SearchParams = {
  q?: string;
  account?: string;
  category?: string;
  tag?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: string;
};

function buildQueryString(sp: SearchParams, page: number): string {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v && k !== "page") next.set(k, v);
  }
  next.set("page", String(page));
  return next.toString();
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (!(await hasData())) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <EmptyState />
      </div>
    );
  }

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const filters: TransactionFilters = {
    q: sp.q,
    accountId: sp.account,
    parentCategoryId: sp.category,
    tag: sp.tag,
    status: sp.status,
    from: sp.from,
    to: sp.to,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const [{ rows, total }, accounts, categories, tags] = await Promise.all([
    getTransactions(filters),
    getAccountRefs(),
    getParentCategories(),
    getTags(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : filters.offset + 1;
  const end = Math.min(filters.offset + PAGE_SIZE, total);

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <span className="text-sm text-zinc-500">
          {total.toLocaleString()} total
        </span>
      </div>

      <Filters accounts={accounts} categories={categories} tags={tags} />

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">Description</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 font-medium">Account</th>
              <th className="px-4 py-2.5 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60">
                <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-zinc-500">{t.created_at}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-900">{t.description}</span>
                    {t.status === "HELD" && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-700">
                        held
                      </span>
                    )}
                  </div>
                  {t.tags && <div className="mt-0.5 text-xs text-zinc-400">#{t.tags.replaceAll(", ", " #")}</div>}
                </td>
                <td className="px-4 py-2.5 text-zinc-600">{t.parent_category_name ?? "—"}</td>
                <td className="px-4 py-2.5 text-zinc-600">{t.account_name ?? "—"}</td>
                <td className="px-4 py-2.5 text-right font-medium">
                  <Money amount={t.amount} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-400">
                  No transactions match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-zinc-500">
        <span>
          {start}–{end} of {total.toLocaleString()}
        </span>
        <div className="flex items-center gap-2">
          <PageLink sp={sp} page={page - 1} disabled={page <= 1}>
            ← Prev
          </PageLink>
          <span className="tabular-nums">
            Page {page} / {totalPages}
          </span>
          <PageLink sp={sp} page={page + 1} disabled={page >= totalPages}>
            Next →
          </PageLink>
        </div>
      </div>
    </div>
  );
}

function PageLink({
  sp,
  page,
  disabled,
  children,
}: {
  sp: SearchParams;
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="rounded-md border border-zinc-200 px-3 py-1.5 text-zinc-300">{children}</span>;
  }
  return (
    <Link
      href={`/transactions?${buildQueryString(sp, page)}`}
      className="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-100"
    >
      {children}
    </Link>
  );
}
