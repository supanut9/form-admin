"use client";

import { useState, use } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Stack,
  Title,
  Text,
  Paper,
  Group,
  Card,
  Alert,
  Center,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import type { DatesRangeValue } from "@mantine/dates";
import { IconChartBar, IconInfoCircle } from "@tabler/icons-react";
import { StatsRow } from "@/components/analytics/stats-row";
import { DailyTrendChart } from "@/components/analytics/daily-trend-chart";
import { getFunnel } from "@/lib/funnel";
import { FunnelChart } from "@/components/builder/funnel-chart";
import { FunnelTable } from "@/components/builder/funnel-table";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns YYYY-MM-DD string for today minus `daysAgo`. */
function isoDateDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/** Parses a YYYY-MM-DD string into a Date at midnight local time. */
function parseIso(s: string): Date {
  return new Date(s + "T00:00:00");
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AnalyticsPage({ params }: PageProps) {
  const { id: formId } = use(params);

  // ── Date range state — default = last 30 days ──────────────────────────────
  // @mantine/dates DatePickerInput with type="range" yields [string|null, string|null]
  // where strings are YYYY-MM-DD. We store as strings to match the Mantine API.
  const [dateRange, setDateRange] = useState<DatesRangeValue>([
    isoDateDaysAgo(29),
    isoDateDaysAgo(0),
  ]);

  const from = (dateRange[0] as string | null) ?? isoDateDaysAgo(29);
  const to = (dateRange[1] as string | null) ?? isoDateDaysAgo(0);

  // Convert to Date objects for FunnelChart (which expects Date props per L12 signature)
  const fromDate = parseIso(from);
  const toDate = parseIso(to);

  // ── Single aggregate query shared by StatsRow ────────────────────────────────
  const { data: funnel, isLoading: funnelLoading } = useQuery({
    queryKey: ["funnel", formId, from, to],
    queryFn: () => getFunnel(formId, { from, to }),
    staleTime: 60_000,
  });

  const noData = !funnelLoading && (funnel?.visitors ?? 0) === 0;

  return (
    <Stack gap="lg" p="md">
      {/* Header */}
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
        <Stack gap={2}>
          <Title order={2}>Analytics</Title>
          <Text c="dimmed" size="sm">
            Funnel metrics and daily trends for this form.
          </Text>
        </Stack>

        {/* Date range picker — default = last 30 days; state lifted here */}
        <DatePickerInput
          type="range"
          label="Date range"
          placeholder="Pick dates"
          value={dateRange}
          onChange={setDateRange}
          size="xs"
          w={240}
          clearable={false}
          maxDate={isoDateDaysAgo(0)}
        />
      </Group>

      {/* No-data banner — visible when visitors === 0 */}
      {noData && (
        <Alert
          icon={<IconInfoCircle size={16} />}
          color="gray"
          title="No data yet"
          radius="md"
        >
          No funnel events have been recorded for this form in the selected
          date range. Try adjusting the dates or share the form to start
          collecting data.
        </Alert>
      )}

      {/* Stats row — always visible */}
      <StatsRow funnel={funnel} isLoading={funnelLoading} />

      {/* Daily trend chart — always visible */}
      <Card withBorder radius="md" padding="md">
        <Text fw={600} mb="md" size="sm">
          Daily Trend
        </Text>
        <DailyTrendChart formIdOrSlug={formId} from={from} to={to} />
      </Card>

      {/* Funnel chart — always visible (component handles its own no-data state) */}
      <Card withBorder radius="md" padding="md">
        <Text fw={600} mb="md" size="sm">
          Funnel Overview
        </Text>
        <FunnelChart formIdOrSlug={formId} from={fromDate} to={toDate} />
      </Card>

      {/* Funnel table — hidden when visitors === 0 (all counts are 0 → empty table) */}
      {!noData ? (
        <Card withBorder radius="md" padding="md">
          <Text fw={600} mb="md" size="sm">
            Page-by-Page Drop-off
          </Text>
          <FunnelTable formIdOrSlug={formId} from={from} to={to} />
        </Card>
      ) : (
        <Paper withBorder radius="md" p="xl">
          <Center>
            <Stack align="center" gap="xs">
              <IconChartBar
                size={40}
                color="var(--mantine-color-gray-5)"
                stroke={1.2}
              />
              <Text c="dimmed" size="sm" ta="center">
                Page-by-page drop-off data will appear here once visitors start
                filling in the form.
              </Text>
            </Stack>
          </Center>
        </Paper>
      )}
    </Stack>
  );
}
