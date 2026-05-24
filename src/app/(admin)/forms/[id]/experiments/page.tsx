"use client";

import { useState, use } from "react";
import {
  Stack,
  Title,
  Text,
  Button,
  Group,
  Center,
  Paper,
} from "@mantine/core";
import { IconAB2 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { listExperiments, type Experiment } from "@/lib/experiments";
import { ExperimentCard } from "@/components/experiments/experiment-card";
import { ExperimentSidePanel } from "@/components/experiments/experiment-side-panel";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ExperimentsPage({ params }: PageProps) {
  const { id: formId } = use(params);

  const { data: experiments = [], isLoading } = useQuery({
    queryKey: ["experiments", formId],
    queryFn: () => listExperiments(formId),
    staleTime: 30_000,
  });

  // Side panel state
  const [panelOpen, setPanelOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Experiment | null>(null);

  function openCreate() {
    setEditTarget(null);
    setPanelOpen(true);
  }

  function openEdit(exp: Experiment) {
    setEditTarget(exp);
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setEditTarget(null);
  }

  return (
    <>
      {/* Side panel — mounted here, slides in from right */}
      {panelOpen && editTarget ? (
        <ExperimentSidePanel
          mode="edit"
          formIdOrSlug={formId}
          experiment={editTarget}
          opened={panelOpen}
          onClose={closePanel}
        />
      ) : (
        <ExperimentSidePanel
          mode="create"
          formIdOrSlug={formId}
          opened={panelOpen}
          onClose={closePanel}
        />
      )}

      <Stack gap="lg" p="md">
        {/* Page header */}
        <Group justify="space-between" align="center">
          <Stack gap={2}>
            <Title order={2}>Experiments</Title>
            <Text c="dimmed" size="sm">
              A/B test different form versions to optimize your primary metric.
            </Text>
          </Stack>
          <Button
            leftSection={<IconAB2 size={16} />}
            onClick={openCreate}
          >
            New experiment
          </Button>
        </Group>

        {/* Empty state */}
        {!isLoading && experiments.length === 0 && (
          <Paper withBorder radius="md" p="xl">
            <Center>
              <Stack align="center" gap="md">
                <IconAB2 size={48} color="var(--mantine-color-gray-5)" stroke={1.2} />
                <Stack gap={4} align="center">
                  <Text fw={600} ta="center">
                    No experiments yet
                  </Text>
                  <Text c="dimmed" size="sm" ta="center" maw={360}>
                    Run an A/B test to compare different versions of this form and
                    find out which converts better.
                  </Text>
                </Stack>
                <Button variant="light" onClick={openCreate}>
                  Create your first experiment
                </Button>
              </Stack>
            </Center>
          </Paper>
        )}

        {/* Experiment list */}
        {experiments.length > 0 && (
          <Stack gap="md">
            {experiments.map((exp) => (
              <ExperimentCard
                key={exp.id}
                experiment={exp}
                formIdOrSlug={formId}
                onEdit={openEdit}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </>
  );
}
