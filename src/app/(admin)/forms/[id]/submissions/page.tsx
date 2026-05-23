import { Suspense } from "react";
import { Stack, Title, Text, Skeleton } from "@mantine/core";
import { SubmissionsTable } from "@/components/submissions/submissions-table";
import { StatsCard } from "@/components/submissions/stats-card";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SubmissionsPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Stack gap="md" p="md">
      <Stack gap={4}>
        <Title order={2}>Submissions</Title>
        <Text c="dimmed" size="sm">
          Newest first. Click a row to see the full payload.
        </Text>
      </Stack>
      <StatsCard formId={id} />
      <Suspense fallback={<Skeleton height={300} />}>
        <SubmissionsTable formId={id} />
      </Suspense>
    </Stack>
  );
}
