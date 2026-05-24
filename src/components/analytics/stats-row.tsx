"use client";

import { SimpleGrid, Paper, Text, Skeleton, Stack } from "@mantine/core";
import type { FunnelData } from "@/lib/funnel";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  funnel: FunnelData | undefined;
  isLoading: boolean;
}

interface StatCardProps {
  label: string;
  value: string;
}

// ── Sub-component ─────────────────────────────────────────────────────────────

function StatCard({ label, value }: StatCardProps) {
  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap={4}>
        <Text size="xl" fw={700} lh={1}>
          {value}
        </Text>
        <Text size="sm" c="dimmed">
          {label}
        </Text>
      </Stack>
    </Paper>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StatsRow({ funnel, isLoading }: Props) {
  if (isLoading) {
    return (
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={76} radius="md" />
        ))}
      </SimpleGrid>
    );
  }

  const visitors = funnel?.visitors ?? 0;
  const submitAttempts = funnel?.submitAttempts ?? 0;
  const submitOk = funnel?.submitOk ?? 0;
  const conversionRate = funnel?.conversionRate ?? 0;

  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
      <StatCard label="Visitors" value={visitors.toLocaleString()} />
      <StatCard
        label="Submit Attempts"
        value={submitAttempts.toLocaleString()}
      />
      <StatCard label="Submissions" value={submitOk.toLocaleString()} />
      <StatCard
        label="Conversion Rate"
        value={`${(conversionRate * 100).toFixed(1)}%`}
      />
    </SimpleGrid>
  );
}
