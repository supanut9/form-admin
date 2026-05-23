"use client";

import { useQuery } from "@tanstack/react-query";
import { Paper, Group, Text, Skeleton, Stack } from "@mantine/core";
import { Sparkline } from "@mantine/charts";
import { formClient } from "@/lib/form-client";

interface StatsPoint {
  day: string;
  count: number;
}

interface SubmissionsStats {
  days: number;
  total_in_range: number;
  total_all_time: number;
  points: StatsPoint[];
}

export function StatsCard({ formId }: { formId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["submissions-stats", formId],
    queryFn: () =>
      formClient.get<SubmissionsStats>(
        `/admin/forms/${formId}/submissions/stats?days=30`,
      ),
  });

  if (isLoading) {
    return <Skeleton height={80} radius="md" />;
  }

  if (isError || !data) {
    return (
      <Paper withBorder p="md" radius="md">
        <Text size="sm" c="dimmed">
          No submissions yet
        </Text>
      </Paper>
    );
  }

  const counts = data.points.map((p) => p.count);
  const hasActivity = counts.some((c) => c > 0);

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start">
          <Text size="sm" c="dimmed" fw={500}>
            Last {data.days} days
          </Text>
          <Text size="xl" fw={700} lh={1}>
            {data.total_in_range.toLocaleString()}
          </Text>
        </Group>

        {hasActivity ? (
          <Sparkline
            w="100%"
            h={64}
            data={counts}
            curveType="natural"
            color="indigo"
            fillOpacity={0.15}
            trendColors={{ positive: "teal", negative: "red", neutral: "indigo" }}
          />
        ) : (
          <Text size="sm" c="dimmed" ta="center" py="xs">
            No submissions yet
          </Text>
        )}

        <Text size="xs" c="dimmed">
          {data.total_all_time.toLocaleString()} all-time
        </Text>
      </Stack>
    </Paper>
  );
}
