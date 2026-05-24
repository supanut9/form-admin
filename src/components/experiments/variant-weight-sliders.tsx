"use client";

import { useMemo } from "react";
import {
  Stack,
  Group,
  Text,
  Badge,
  Select,
  Slider,
  Alert,
} from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VariantRow {
  id: string;
  label: string;
  version_id: string;
  weight_bps: number;
}

export interface FormVersion {
  id: string;
  version: number;
  is_current: boolean;
}

interface Props {
  variants: VariantRow[];
  versions: FormVersion[];
  onChange: (next: VariantRow[]) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MIN_BPS = 100; // 1 %

/**
 * Auto-rebalance: when `changedIdx` slider moves to `newBps`, scale the
 * remaining variants proportionally so the total stays 10 000.
 */
function rebalance(variants: VariantRow[], changedIdx: number, newBps: number): VariantRow[] {
  const clamped = Math.max(0, Math.min(10000, newBps));
  const remaining = 10000 - clamped;

  const others = variants.filter((_, i) => i !== changedIdx);
  const othersTotal = others.reduce((s, v) => s + v.weight_bps, 0);

  const scaled = others.map((v) => {
    const ratio = othersTotal > 0 ? v.weight_bps / othersTotal : 1 / others.length;
    return Math.round(ratio * remaining);
  });

  // Fix rounding drift: push any leftover onto the last other variant
  const scaledSum = scaled.reduce((s, x) => s + x, 0);
  const drift = remaining - scaledSum;
  if (scaled.length > 0) scaled[scaled.length - 1] += drift;

  return variants.map((v, i) => {
    if (i === changedIdx) return { ...v, weight_bps: clamped };
    const pos = variants.slice(0, i).filter((_, j) => j !== changedIdx).length;
    return { ...v, weight_bps: scaled[pos] ?? v.weight_bps };
  });
}

/**
 * Re-index others correctly by building a compact list of their new bps.
 */
function rebalanceCorrect(variants: VariantRow[], changedIdx: number, newBps: number): VariantRow[] {
  const clamped = Math.max(0, Math.min(10000, newBps));
  const remaining = 10000 - clamped;

  const otherIndices = variants.map((_, i) => i).filter((i) => i !== changedIdx);
  const othersTotal = otherIndices.reduce((s, i) => s + variants[i].weight_bps, 0);

  const newWeights = new Map<number, number>();
  newWeights.set(changedIdx, clamped);

  const scaled = otherIndices.map((i) => {
    const ratio = othersTotal > 0 ? variants[i].weight_bps / othersTotal : 1 / otherIndices.length;
    return { idx: i, bps: Math.round(ratio * remaining) };
  });

  // Fix rounding drift
  const scaledSum = scaled.reduce((s, x) => s + x.bps, 0);
  const drift = remaining - scaledSum;
  if (scaled.length > 0) scaled[scaled.length - 1].bps += drift;

  scaled.forEach(({ idx, bps }) => newWeights.set(idx, bps));

  return variants.map((v, i) => ({ ...v, weight_bps: newWeights.get(i) ?? v.weight_bps }));
}

// ── Component ─────────────────────────────────────────────────────────────────

export function VariantWeightSliders({ variants, versions, onChange }: Props) {
  const total = variants.reduce((s, v) => s + v.weight_bps, 0);
  const isBalanced = total === 10000;

  const nudgedBelow = useMemo(
    () => variants.some((v) => v.weight_bps > 0 && v.weight_bps < MIN_BPS),
    [variants],
  );

  const versionOptions = versions.map((v) => ({
    value: v.id,
    label: `v${v.version}${v.is_current ? " (current)" : ""}`,
  }));

  function handleSliderChange(idx: number, newBps: number) {
    onChange(rebalanceCorrect(variants, idx, newBps));
  }

  function handleVersionChange(idx: number, versionId: string | null) {
    if (!versionId) return;
    onChange(variants.map((v, i) => (i === idx ? { ...v, version_id: versionId } : v)));
  }

  return (
    <Stack gap="md">
      {nudgedBelow && (
        <Alert
          icon={<IconAlertTriangle size={14} />}
          color="red"
          variant="light"
          p="xs"
          radius="sm"
        >
          One or more variants were nudged below 1% (100 bps) during rebalancing.
        </Alert>
      )}

      {variants.map((variant, idx) => {
        const pct = ((variant.weight_bps / 10000) * 100).toFixed(1);
        return (
          <Stack key={variant.id} gap={6}>
            <Group justify="space-between" align="center">
              <Text fw={500} size="sm">
                {variant.label}
              </Text>
              <Text size="sm" c="dimmed">
                {pct}%
              </Text>
            </Group>

            <Select
              size="xs"
              placeholder="Pick a version"
              data={versionOptions}
              value={variant.version_id || null}
              onChange={(val) => handleVersionChange(idx, val)}
              searchable
            />

            <Slider
              min={0}
              max={10000}
              step={50}
              value={variant.weight_bps}
              onChange={(val) => handleSliderChange(idx, val)}
              label={(val) => `${((val / 10000) * 100).toFixed(1)}%`}
              size="sm"
              marks={[
                { value: 0, label: "0%" },
                { value: 5000, label: "50%" },
                { value: 10000, label: "100%" },
              ]}
            />
          </Stack>
        );
      })}

      {/* Total indicator */}
      <Group justify="flex-end" mt="xs">
        <Badge
          color={isBalanced ? "green" : "red"}
          variant="light"
          size="sm"
        >
          Total: {((total / 10000) * 100).toFixed(1)}%
          {!isBalanced && " — must equal 100%"}
        </Badge>
      </Group>
    </Stack>
  );
}
