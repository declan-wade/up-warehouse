/**
 * Up represents money as `valueInBaseUnits` — an integer number of the currency's
 * minor unit (cents for AUD), negative for debits. We store base units for exact
 * arithmetic and derive dollar figures only for display.
 */

export function baseUnitsToAmount(baseUnits: number | bigint | null | undefined): number {
  if (baseUnits === null || baseUnits === undefined) return 0;
  return Number(baseUnits) / 100;
}

const audFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

/** Format a dollar amount (not base units) as AUD currency, e.g. -59.98 -> "-$59.98". */
export function formatAud(amount: number | null | undefined): string {
  return audFormatter.format(amount ?? 0);
}

/** Format integer base units (cents) as AUD currency. */
export function formatBaseUnits(baseUnits: number | bigint | null | undefined): string {
  return formatAud(baseUnitsToAmount(baseUnits));
}

/** Compact currency for axis ticks, e.g. 1234.5 -> "$1.2k". */
export function formatAudCompact(amount: number | null | undefined): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount ?? 0);
}
