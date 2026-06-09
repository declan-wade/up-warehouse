"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { NamedRef } from "@/lib/db/queries";

export function Filters({
  accounts,
  categories,
  tags,
}: {
  accounts: NamedRef[];
  categories: NamedRef[];
  tags: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  function update(patch: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page"); // reset pagination on any filter change
    router.push(`${pathname}?${next.toString()}`);
  }

  const selectClass =
    "rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-700 focus:border-zinc-500 focus:outline-none";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ q });
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search description…"
          className={`${selectClass} w-56`}
        />
      </form>

      <select
        className={selectClass}
        value={params.get("account") ?? ""}
        onChange={(e) => update({ account: e.target.value })}
      >
        <option value="">All accounts</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={params.get("category") ?? ""}
        onChange={(e) => update({ category: e.target.value })}
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={params.get("tag") ?? ""}
        onChange={(e) => update({ tag: e.target.value })}
      >
        <option value="">All tags</option>
        {tags.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={params.get("status") ?? ""}
        onChange={(e) => update({ status: e.target.value })}
      >
        <option value="">Any status</option>
        <option value="SETTLED">Settled</option>
        <option value="HELD">Held</option>
      </select>

      <input
        type="date"
        className={selectClass}
        value={params.get("from") ?? ""}
        onChange={(e) => update({ from: e.target.value })}
        title="From date"
      />
      <input
        type="date"
        className={selectClass}
        value={params.get("to") ?? ""}
        onChange={(e) => update({ to: e.target.value })}
        title="To date"
      />

      {[...params.keys()].some((k) => k !== "page") && (
        <button
          onClick={() => router.push(pathname)}
          className="rounded-md px-2.5 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
        >
          Clear
        </button>
      )}
    </div>
  );
}
