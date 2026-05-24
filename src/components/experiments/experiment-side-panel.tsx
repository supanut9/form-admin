"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  Stack,
  TextInput,
  Textarea,
  Select,
  Button,
  Group,
  Text,
  Badge,
  Alert,
  Divider,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createExperiment,
  patchExperiment,
  stopWithWinner,
  type Experiment,
  type PrimaryMetric,
} from "@/lib/experiments";
import { VariantWeightSliders, type VariantRow } from "./variant-weight-sliders";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormVersion {
  id: string;
  version: number;
  is_current: boolean;
}

interface CreateMode {
  mode: "create";
  formIdOrSlug: string;
  experiment?: undefined;
}

interface EditMode {
  mode: "edit";
  formIdOrSlug: string;
  experiment: Experiment;
}

type Props = (CreateMode | EditMode) & {
  opened: boolean;
  onClose: () => void;
};

// ── Default variants (50/50 split) ────────────────────────────────────────────

function makeDefaultVariants(): VariantRow[] {
  return [
    { id: `tmp-a-${Date.now()}`, label: "Variant A", version_id: "", weight_bps: 5000 },
    { id: `tmp-b-${Date.now() + 1}`, label: "Variant B", version_id: "", weight_bps: 5000 },
  ];
}

// ── Sub-component: Create form ────────────────────────────────────────────────

function CreateForm({
  formIdOrSlug,
  versions,
  onClose,
}: {
  formIdOrSlug: string;
  versions: FormVersion[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [metric, setMetric] = useState<PrimaryMetric>("submit_rate");
  const [variants, setVariants] = useState<VariantRow[]>(makeDefaultVariants);

  const total = variants.reduce((s, v) => s + v.weight_bps, 0);
  const valid =
    name.trim().length > 0 &&
    total === 10000 &&
    variants.length >= 2 &&
    variants.every((v) => v.version_id);

  const mutation = useMutation({
    mutationFn: () =>
      createExperiment(formIdOrSlug, {
        name: name.trim(),
        hypothesis: hypothesis.trim() || undefined,
        primary_metric: metric,
        variants: variants.map((v) => ({
          label: v.label,
          version_id: v.version_id,
          weight_bps: v.weight_bps,
        })),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["experiments", formIdOrSlug] });
      onClose();
    },
  });

  return (
    <Stack gap="md">
      <TextInput
        label="Name"
        placeholder="Homepage button color test"
        required
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
      />

      <Textarea
        label="Hypothesis"
        placeholder="We believe that… will result in…"
        minRows={2}
        value={hypothesis}
        onChange={(e) => setHypothesis(e.currentTarget.value)}
      />

      <Select
        label="Primary metric"
        required
        value={metric}
        onChange={(v) => setMetric((v as PrimaryMetric) ?? "submit_rate")}
        data={[
          { value: "submit_rate", label: "Submit rate" },
          { value: "completion_rate", label: "Completion rate" },
          { value: "payment_conversion", label: "Payment conversion" },
        ]}
      />

      <Divider label="Variants" labelPosition="left" />

      <VariantWeightSliders
        variants={variants}
        versions={versions}
        onChange={setVariants}
      />

      {mutation.isError && (
        <Alert icon={<IconInfoCircle size={14} />} color="red" variant="light">
          {(mutation.error as Error).message}
        </Alert>
      )}

      <Group justify="flex-end" mt="sm">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button
          loading={mutation.isPending}
          disabled={!valid}
          onClick={() => mutation.mutate()}
        >
          Create experiment
        </Button>
      </Group>
    </Stack>
  );
}

// ── Sub-component: Edit / view running experiment ─────────────────────────────

function EditPanel({
  formIdOrSlug,
  experiment,
  versions,
  onClose,
}: {
  formIdOrSlug: string;
  experiment: Experiment;
  versions: FormVersion[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isRunning = experiment.status === "running";

  const [variants, setVariants] = useState<VariantRow[]>(
    experiment.variants.map((v) => ({
      id: v.id,
      label: v.label,
      version_id: v.version_id,
      weight_bps: v.weight_bps,
    })),
  );

  useEffect(() => {
    setVariants(
      experiment.variants.map((v) => ({
        id: v.id,
        label: v.label,
        version_id: v.version_id,
        weight_bps: v.weight_bps,
      })),
    );
  }, [experiment]);

  const patchMutation = useMutation({
    mutationFn: () =>
      patchExperiment(experiment.id, {
        variants: variants.map((v) => ({ id: v.id, weight_bps: v.weight_bps })),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["experiments", formIdOrSlug] });
    },
  });

  const versionMap = new Map(versions.map((v) => [v.id, v]));

  return (
    <Stack gap="md">
      <Group gap="xs">
        <Text fw={600} size="sm">
          {experiment.name}
        </Text>
        <StatusBadge status={experiment.status} />
      </Group>

      {experiment.hypothesis && (
        <Text size="sm" c="dimmed">
          {experiment.hypothesis}
        </Text>
      )}

      <Text size="xs" c="dimmed">
        Metric:{" "}
        <Text component="span" fw={500}>
          {experiment.primaryMetric.replace(/_/g, " ")}
        </Text>
      </Text>

      <Divider label="Variants" labelPosition="left" />

      {isRunning ? (
        // Running: weights are read-only (changing mid-experiment would skew data)
        <Stack gap="sm">
          {experiment.variants.map((v) => {
            const ver = versionMap.get(v.version_id);
            return (
              <Group key={v.id} justify="space-between" wrap="nowrap">
                <Stack gap={2}>
                  <Text size="sm" fw={500}>
                    {v.label}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {ver ? `v${ver.version}` : v.version_id}
                  </Text>
                </Stack>
                <Text size="sm">{((v.weight_bps / 10000) * 100).toFixed(1)}%</Text>
              </Group>
            );
          })}
          <Alert icon={<IconInfoCircle size={14} />} color="blue" variant="light" p="xs">
            Variant weights are locked while the experiment is running to avoid skewing results.
          </Alert>
        </Stack>
      ) : (
        <>
          <VariantWeightSliders
            variants={variants}
            versions={versions}
            onChange={setVariants}
          />
          <Group justify="flex-end">
            <Button
              size="xs"
              variant="default"
              loading={patchMutation.isPending}
              onClick={() => patchMutation.mutate()}
            >
              Save weights
            </Button>
          </Group>
        </>
      )}

      <Group justify="flex-end" mt="sm">
        <Button variant="default" onClick={onClose}>
          Close
        </Button>
      </Group>
    </Stack>
  );
}

// ── Status badge helper ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Experiment["status"] }) {
  const map = {
    draft: { color: "gray", label: "Draft" },
    running: { color: "green", label: "Running" },
    stopped: { color: "blue", label: "Stopped" },
  } as const;
  const { color, label } = map[status];
  return (
    <Badge size="xs" color={color} variant="light">
      {label}
    </Badge>
  );
}

// ── Versions loader ───────────────────────────────────────────────────────────

function useFormVersions(formIdOrSlug: string) {
  return useQuery<FormVersion[]>({
    queryKey: ["form-versions", formIdOrSlug],
    queryFn: () =>
      fetch(`/api/proxy/v1/admin/forms/${formIdOrSlug}/versions`, { credentials: "include" }).then(
        (r) => r.json() as Promise<FormVersion[]>,
      ),
    staleTime: 60_000,
  });
}

// ── Main export ───────────────────────────────────────────────────────────────

export function ExperimentSidePanel(props: Props) {
  const { opened, onClose, formIdOrSlug, mode } = props;
  const versionsQuery = useFormVersions(formIdOrSlug);
  const versions = versionsQuery.data ?? [];

  const title = mode === "create" ? "New experiment" : "Edit experiment";

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={title}
      position="right"
      size="md"
      padding="lg"
      overlayProps={{ backgroundOpacity: 0.35, blur: 2 }}
    >
      {mode === "create" ? (
        <CreateForm
          formIdOrSlug={formIdOrSlug}
          versions={versions}
          onClose={onClose}
        />
      ) : (
        <EditPanel
          formIdOrSlug={formIdOrSlug}
          experiment={props.experiment}
          versions={versions}
          onClose={onClose}
        />
      )}
    </Drawer>
  );
}
