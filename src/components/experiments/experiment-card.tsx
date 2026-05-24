"use client";

import { useState } from "react";
import {
  Paper,
  Group,
  Stack,
  Text,
  Badge,
  Button,
  Progress,
  Modal,
  ScrollArea,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  startExperiment,
  stopExperiment,
  stopWithWinner,
  type Experiment,
  computeConversion,
} from "@/lib/experiments";

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Experiment["status"] }) {
  const map = {
    draft: { color: "gray" as const, label: "Draft" },
    running: { color: "green" as const, label: "Running" },
    stopped: { color: "blue" as const, label: "Stopped" },
  };
  const { color, label } = map[status];
  return (
    <Badge size="xs" color={color} variant="light">
      {label}
    </Badge>
  );
}

// ── Conversion display ────────────────────────────────────────────────────────

function ConversionLabel({
  exposures,
  submissions,
}: {
  exposures: number;
  submissions: number;
}) {
  const result = computeConversion(exposures, submissions);
  if (!result) return <Text size="xs" c="dimmed">—</Text>;
  const ratePct = (result.rate * 100).toFixed(1);
  const ciMargin = (((result.ci95[1] - result.ci95[0]) / 2) * 100).toFixed(1);
  return (
    <Text size="xs" c="dimmed">
      {ratePct}% ± {ciMargin}%
    </Text>
  );
}

// ── Stop-with-winner modal ────────────────────────────────────────────────────

function WinnerModal({
  opened,
  onClose,
  experiment,
  formIdOrSlug,
}: {
  opened: boolean;
  onClose: () => void;
  experiment: Experiment;
  formIdOrSlug: string;
}) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (variantId: string) => stopWithWinner(experiment.id, variantId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["experiments", formIdOrSlug] });
      onClose();
    },
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Stop with winner"
      size="sm"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Select the winning variant. The form will be locked to that version.
        </Text>

        <ScrollArea.Autosize mah={300}>
          <Stack gap="xs">
            {experiment.variants.map((v) => {
              const exposures = v.exposures ?? 0;
              const submissions = v.submissions ?? 0;
              const isSelected = selectedId === v.id;
              return (
                <Paper
                  key={v.id}
                  withBorder
                  p="sm"
                  radius="sm"
                  style={{
                    cursor: "pointer",
                    borderColor: isSelected
                      ? "var(--mantine-color-indigo-5)"
                      : undefined,
                    background: isSelected
                      ? "var(--mantine-color-indigo-light)"
                      : undefined,
                  }}
                  onClick={() => setSelectedId(v.id)}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Stack gap={2}>
                      <Text size="sm" fw={500}>
                        {v.label}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {exposures.toLocaleString()} exposures ·{" "}
                        {submissions.toLocaleString()} submissions
                      </Text>
                    </Stack>
                    <ConversionLabel
                      exposures={exposures}
                      submissions={submissions}
                    />
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        </ScrollArea.Autosize>

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color="indigo"
            disabled={!selectedId}
            loading={mutation.isPending}
            onClick={() => selectedId && mutation.mutate(selectedId)}
          >
            Confirm winner
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ── ExperimentCard ────────────────────────────────────────────────────────────

interface Props {
  experiment: Experiment;
  formIdOrSlug: string;
  onEdit: (experiment: Experiment) => void;
}

export function ExperimentCard({ experiment, formIdOrSlug, onEdit }: Props) {
  const qc = useQueryClient();
  const [winnerModalOpen, { open: openWinner, close: closeWinner }] = useDisclosure();

  const startMutation = useMutation({
    mutationFn: () => startExperiment(experiment.id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["experiments", formIdOrSlug] }),
  });

  const stopMutation = useMutation({
    mutationFn: () => stopExperiment(experiment.id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["experiments", formIdOrSlug] }),
  });

  const winnerVariant =
    experiment.winnerVariantId
      ? experiment.variants.find((v) => v.id === experiment.winnerVariantId)
      : null;

  const metricLabel = experiment.primaryMetric.replace(/_/g, " ");

  return (
    <>
      <WinnerModal
        opened={winnerModalOpen}
        onClose={closeWinner}
        experiment={experiment}
        formIdOrSlug={formIdOrSlug}
      />

      <Paper withBorder radius="md" p="md">
        <Stack gap="sm">
          {/* Header */}
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Stack gap={2}>
              <Group gap="xs">
                <Text fw={600}>{experiment.name}</Text>
                <StatusBadge status={experiment.status} />
                {winnerVariant && (
                  <Badge size="xs" color="yellow" variant="light">
                    Winner: {winnerVariant.label}
                  </Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed">
                Metric: {metricLabel}
              </Text>
              {experiment.hypothesis && (
                <Text size="xs" c="dimmed" lineClamp={2}>
                  {experiment.hypothesis}
                </Text>
              )}
            </Stack>

            {/* Actions */}
            <Group gap="xs" style={{ flexShrink: 0 }}>
              {experiment.status === "draft" && (
                <Tooltip label="Start the experiment">
                  <Button
                    size="xs"
                    color="green"
                    variant="light"
                    loading={startMutation.isPending}
                    onClick={() => startMutation.mutate()}
                  >
                    Start
                  </Button>
                </Tooltip>
              )}
              {experiment.status === "running" && (
                <>
                  <Button
                    size="xs"
                    color="red"
                    variant="light"
                    loading={stopMutation.isPending}
                    onClick={() => stopMutation.mutate()}
                  >
                    Stop
                  </Button>
                  <Button
                    size="xs"
                    color="yellow"
                    variant="light"
                    onClick={openWinner}
                  >
                    Stop with winner
                  </Button>
                </>
              )}
              <Button
                size="xs"
                variant="default"
                onClick={() => onEdit(experiment)}
                disabled={experiment.status === "stopped"}
              >
                Edit
              </Button>
            </Group>
          </Group>

          {/* Variants bar chart */}
          {experiment.variants.length > 0 && (
            <Stack gap={6}>
              {experiment.variants.map((v) => {
                const exposures = v.exposures ?? 0;
                const submissions = v.submissions ?? 0;
                const fillPct = exposures > 0 ? (submissions / exposures) * 100 : 0;
                const weightPct = ((v.weight_bps / 10000) * 100).toFixed(0);
                return (
                  <Stack key={v.id} gap={2}>
                    <Group justify="space-between">
                      <Group gap="xs">
                        <Text size="xs" fw={500}>
                          {v.label}
                        </Text>
                        <Text size="xs" c="dimmed">
                          ({weightPct}% traffic)
                        </Text>
                      </Group>
                      <Group gap="xs">
                        <Text size="xs" c="dimmed">
                          {submissions}/{exposures}
                        </Text>
                        <ConversionLabel
                          exposures={exposures}
                          submissions={submissions}
                        />
                      </Group>
                    </Group>
                    <Progress
                      value={fillPct}
                      size="sm"
                      color="indigo"
                      radius="xs"
                    />
                  </Stack>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Paper>
    </>
  );
}
