import { query, queryOne } from "./duck";

/**
 * Analytics query helpers for the web UI. All amounts come back as DOUBLE dollars
 * (negative = money out). Transactions in Up include internal transfers between your
 * own accounts; for income/expense analytics we exclude rows with a transfer_account_id
 * so moving money between Up accounts doesn't distort spending.
 */

const NOT_TRANSFER = "transfer_account_id IS NULL";

export interface AccountRow {
  id: string;
  display_name: string;
  account_type: string;
  ownership_type: string;
  balance: number;
  created_at: string | null;
}

export async function getAccounts(): Promise<AccountRow[]> {
  return query<AccountRow>(
    `SELECT id, display_name, account_type, ownership_type, balance,
            strftime(created_at, '%Y-%m-%d') AS created_at
     FROM accounts
     ORDER BY account_type, balance DESC`,
  );
}

export async function getTotalBalance(): Promise<number> {
  const row = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(balance), 0) AS total FROM accounts`,
  );
  return row?.total ?? 0;
}

export interface KpiSummary {
  spent: number; // positive number = money out this period
  income: number; // positive number = money in this period
  net: number;
  txCount: number;
}

/** Income/expense summary over a date range (inclusive), excluding transfers. */
export async function getSummary(from: string, to: string): Promise<KpiSummary> {
  const row = await queryOne<KpiSummary>(
    `SELECT
       COALESCE(-SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END), 0) AS spent,
       COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS income,
       COALESCE(SUM(amount), 0) AS net,
       CAST(COUNT(*) AS INTEGER) AS "txCount"
     FROM transactions
     WHERE ${NOT_TRANSFER} AND created_at >= ?::TIMESTAMPTZ AND created_at < (?::DATE + INTERVAL 1 DAY)`,
    [from, to],
  );
  return row ?? { spent: 0, income: 0, net: 0, txCount: 0 };
}

export interface MonthlyCashflow {
  month: string; // YYYY-MM
  income: number;
  expense: number; // positive
  net: number;
}

export async function getMonthlyCashflow(months = 12): Promise<MonthlyCashflow[]> {
  return query<MonthlyCashflow>(
    `SELECT strftime(created_at, '%Y-%m') AS month,
            COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS income,
            COALESCE(-SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END), 0) AS expense,
            COALESCE(SUM(amount), 0) AS net
     FROM transactions
     WHERE ${NOT_TRANSFER}
       AND created_at >= date_trunc('month', now()) - (INTERVAL 1 MONTH * CAST(? AS INTEGER))
     GROUP BY month
     ORDER BY month`,
    [months - 1],
  );
}

export interface CategorySpend {
  category: string;
  amount: number; // positive spend
}

/** Spending grouped by parent category over a range (transfers + income excluded). */
export async function getSpendByCategory(from: string, to: string): Promise<CategorySpend[]> {
  return query<CategorySpend>(
    `SELECT COALESCE(c.name, 'Uncategorised') AS category,
            -SUM(t.amount) AS amount
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.parent_category_id
     WHERE ${NOT_TRANSFER} AND t.amount < 0
       AND t.created_at >= ?::TIMESTAMPTZ AND t.created_at < (?::DATE + INTERVAL 1 DAY)
     GROUP BY category
     ORDER BY amount DESC`,
    [from, to],
  );
}

export interface MerchantSpend {
  description: string;
  amount: number; // positive spend
  count: number;
}

export async function getTopMerchants(from: string, to: string, limit = 10): Promise<MerchantSpend[]> {
  return query<MerchantSpend>(
    `SELECT description,
            -SUM(amount) AS amount,
            CAST(COUNT(*) AS INTEGER) AS count
     FROM transactions
     WHERE ${NOT_TRANSFER} AND amount < 0
       AND created_at >= ?::TIMESTAMPTZ AND created_at < (?::DATE + INTERVAL 1 DAY)
     GROUP BY description
     ORDER BY amount DESC
     LIMIT ?`,
    [from, to, limit],
  );
}

export interface TransactionRow {
  id: string;
  created_at: string | null;
  description: string;
  message: string | null;
  status: string;
  amount: number;
  account_name: string | null;
  category_name: string | null;
  parent_category_name: string | null;
  tags: string | null;
}

export interface TransactionFilters {
  q?: string;
  accountId?: string;
  parentCategoryId?: string;
  tag?: string;
  status?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
}

function buildTxWhere(f: TransactionFilters): { clause: string; params: (string | number)[] } {
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  if (f.q) {
    conditions.push("(t.description ILIKE ? OR t.message ILIKE ? OR t.raw_text ILIKE ?)");
    params.push(`%${f.q}%`, `%${f.q}%`, `%${f.q}%`);
  }
  if (f.accountId) {
    conditions.push("t.account_id = ?");
    params.push(f.accountId);
  }
  if (f.parentCategoryId) {
    conditions.push("t.parent_category_id = ?");
    params.push(f.parentCategoryId);
  }
  if (f.status) {
    conditions.push("t.status = ?");
    params.push(f.status);
  }
  if (f.from) {
    conditions.push("t.created_at >= ?::TIMESTAMPTZ");
    params.push(f.from);
  }
  if (f.to) {
    conditions.push("t.created_at < (?::DATE + INTERVAL 1 DAY)");
    params.push(f.to);
  }
  if (f.tag) {
    conditions.push("EXISTS (SELECT 1 FROM transaction_tags tt WHERE tt.transaction_id = t.id AND tt.tag_id = ?)");
    params.push(f.tag);
  }
  const clause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return { clause, params };
}

export async function getTransactions(
  f: TransactionFilters,
): Promise<{ rows: TransactionRow[]; total: number }> {
  const { clause, params } = buildTxWhere(f);

  const totalRow = await queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM transactions t ${clause}`,
    params,
  );

  const rows = await query<TransactionRow>(
    `SELECT t.id,
            strftime(t.created_at, '%Y-%m-%d %H:%M') AS created_at,
            t.description, t.message, t.status, t.amount,
            a.display_name AS account_name,
            c.name AS category_name,
            pc.name AS parent_category_name,
            (SELECT string_agg(tt.tag_id, ', ') FROM transaction_tags tt WHERE tt.transaction_id = t.id) AS tags
     FROM transactions t
     LEFT JOIN accounts a ON a.id = t.account_id
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN categories pc ON pc.id = t.parent_category_id
     ${clause}
     ORDER BY t.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, f.limit, f.offset],
  );

  return { rows, total: Number(totalRow?.total ?? 0) };
}

export interface NamedRef {
  id: string;
  name: string;
}

/** Parent categories (those without a parent) for filter dropdowns. */
export async function getParentCategories(): Promise<NamedRef[]> {
  return query<NamedRef>(
    `SELECT id, name FROM categories WHERE parent_id IS NULL ORDER BY name`,
  );
}

export async function getAccountRefs(): Promise<NamedRef[]> {
  return query<NamedRef>(
    `SELECT id, display_name AS name FROM accounts ORDER BY display_name`,
  );
}

export async function getTags(): Promise<string[]> {
  const rows = await query<{ id: string }>(`SELECT id FROM tags ORDER BY id`);
  return rows.map((r) => r.id);
}

/** Whether any transactions have been synced yet (drives empty-state UI). */
export async function hasData(): Promise<boolean> {
  const row = await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM transactions`);
  return Number(row?.n ?? 0) > 0;
}
