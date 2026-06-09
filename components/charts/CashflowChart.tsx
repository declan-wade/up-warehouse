"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatAud, formatAudCompact } from "@/lib/money";
import type { MonthlyCashflow } from "@/lib/db/queries";

export function CashflowChart({ data }: { data: MonthlyCashflow[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="#a1a1aa" />
        <YAxis
          tickFormatter={(v) => formatAudCompact(Number(v))}
          tickLine={false}
          axisLine={false}
          fontSize={12}
          stroke="#a1a1aa"
          width={56}
        />
        <Tooltip
          formatter={(value, name) => [formatAud(Number(value)), name]}
          contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 13 }}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
