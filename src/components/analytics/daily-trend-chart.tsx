"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton, Text, Center, Stack } from "@mantine/core";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getFunnelDaily, type FunnelDailyPoint } from "@/lib/funnel";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  formIdOrSlug: string;
  from: string;
  to: string;
}

interface MergedPoint {
  day: string;
  view: number;
  submit_ok: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mergeDaily(
  views: FunnelDailyPoint[],
  submits: FunnelDailyPoint[],
): MergedPoint[] {
  const map = new Map<string, MergedPoint>();

  for (const pt of views) {
    map.set(pt.day, { day: pt.day, view: pt.count, submit_ok: 0 });
  }
  for (const pt of submits) {
    const existing = map.get(pt.day);
    if (existing) {
      existing.submit_ok = pt.count;
    } else {
      map.set(pt.day, { day: pt.day, view: 0, submit_ok: pt.count });
    }
  }

  return [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
}

function formatDay(day: string): string {
  // "2026-05-01" → "May 1"
  try {
    return new Date(day + "T00:00:00").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return day;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DailyTrendChart({ formIdOrSlug, from, to }: Props) {
  const viewQuery = useQuery({
    queryKey: ["funnel-daily", formIdOrSlug, from, to, "view"],
    queryFn: () => getFunnelDaily(formIdOrSlug, { from, to, event_name: "view" }),
    staleTime: 60_000,
  });

  const submitQuery = useQuery({
    queryKey: ["funnel-daily", formIdOrSlug, from, to, "submit_ok"],
    queryFn: () =>
      getFunnelDaily(formIdOrSlug, { from, to, event_name: "submit_ok" }),
    staleTime: 60_000,
  });

  const isLoading = viewQuery.isLoading || submitQuery.isLoading;

  if (isLoading) {
    return <Skeleton height={280} radius="md" />;
  }

  const views = viewQuery.data ?? [];
  const submits = submitQuery.data ?? [];

  if (views.length === 0 && submits.length === 0) {
    return (
      <Center py="xl">
        <Stack align="center" gap="xs">
          <Text c="dimmed" size="sm">
            No daily data for this period.
          </Text>
        </Stack>
      </Center>
    );
  }

  const merged = mergeDaily(views, submits);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart
        data={merged}
        margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-gray-3)" />
        <XAxis
          dataKey="day"
          tickFormatter={formatDay}
          tick={{ fontSize: 11, fill: "var(--mantine-color-dimmed)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "var(--mantine-color-dimmed)" }}
          tickLine={false}
          axisLine={false}
          width={36}
        />
        <Tooltip
          labelFormatter={(label) => formatDay(String(label))}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid var(--mantine-color-gray-3)",
          }}
        />
        <Legend
          iconSize={10}
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
        <Line
          type="monotone"
          dataKey="view"
          name="Views"
          stroke="var(--mantine-color-gray-6)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="submit_ok"
          name="Submissions"
          stroke="var(--mantine-color-indigo-6)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
