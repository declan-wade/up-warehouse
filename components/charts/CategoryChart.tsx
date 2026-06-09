"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatAud } from "@/lib/money";
import type { CategorySpend } from "@/lib/db/queries";

const COLORS = [
  "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
  "#06b6d4", "#a855f7",
];

export function CategoryChart({ data }: { data: CategorySpend[] }) {
  const top = data.slice(0, 12);
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={top}
          dataKey="amount"
          nameKey="category"
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={110}
          paddingAngle={1}
        >
          {top.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [formatAud(Number(value)), name]}
          contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 13 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
