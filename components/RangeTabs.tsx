"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RANGE_PRESETS } from "@/lib/range";

export function RangeTabs({ active }: { active: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function select(key: string) {
    const next = new URLSearchParams(params);
    next.set("range", key);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5 text-sm">
      {RANGE_PRESETS.map((p) => (
        <button
          key={p.key}
          onClick={() => select(p.key)}
          className={`rounded-md px-3 py-1 transition-colors ${
            active === p.key ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
