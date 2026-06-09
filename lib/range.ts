/** Resolve a named range preset (or explicit from/to) into ISO dates for queries. */

export const RANGE_PRESETS = [
  { key: "30d", label: "30 days" },
  { key: "mtd", label: "This month" },
  { key: "ytd", label: "This year" },
  { key: "12m", label: "12 months" },
  { key: "all", label: "All time" },
] as const;

export type RangeKey = (typeof RANGE_PRESETS)[number]["key"];

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface ResolvedRange {
  key: RangeKey;
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
}

export function resolveRange(key: string | undefined): ResolvedRange {
  const today = new Date();
  const to = ymd(today);
  const k = (RANGE_PRESETS.find((p) => p.key === key)?.key ?? "30d") as RangeKey;

  let from: string;
  switch (k) {
    case "mtd":
      from = ymd(new Date(today.getFullYear(), today.getMonth(), 1));
      break;
    case "ytd":
      from = ymd(new Date(today.getFullYear(), 0, 1));
      break;
    case "12m":
      from = ymd(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()));
      break;
    case "all":
      from = "1970-01-01";
      break;
    case "30d":
    default:
      from = ymd(new Date(today.getTime() - 30 * 86_400_000));
      break;
  }
  return { key: k, from, to };
}
