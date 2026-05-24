'use client'

/**
 * FunnelChart — visualises the top-level funnel: visitors → submit attempts → OK.
 *
 * Props:
 *   formIdOrSlug  — passed directly to the admin funnel endpoint
 *   from / to     — date range (inclusive)
 *   version       — optional form version filter
 *
 * Data source: GET /v1/admin/forms/:formIdOrSlug/funnel
 *
 * Renders a descending Recharts BarChart (visitors on top, submit OK at the
 * bottom) with conversion-rate displayed below the chart.
 *
 * L13 (analytics page) imports this component directly. Do not move it.
 */

import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Skeleton,
  Stack,
  Text,
  Group,
  Paper,
  Badge,
} from '@mantine/core'
import { IconAlertCircle, IconUsers } from '@tabler/icons-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { formClient } from '@/lib/form-client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FunnelResponse {
  visitors: number
  pages: Array<{ pageId: string; enter: number; exit: number }>
  submitAttempts: number
  submitOk: number
  submitError: number
  conversionRate: number
}

export interface FunnelChartProps {
  formIdOrSlug: string
  /** Accept Date or ISO/YYYY-MM-DD string — callers may use either form. */
  from: Date | string
  to: Date | string
  version?: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toIsoString(d: Date | string): string {
  return d instanceof Date ? d.toISOString() : d
}

function buildQueryString(from: Date | string, to: Date | string, version?: number): string {
  const params = new URLSearchParams({
    from: toIsoString(from),
    to: toIsoString(to),
  })
  if (version !== undefined) params.set('version', String(version))
  return params.toString()
}

// Bar colours: coolest for bottom-of-funnel, warmest for top
const BAR_COLORS = ['#4c6ef5', '#f59f00', '#2f9e44']

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FunnelChart({ formIdOrSlug, from, to, version }: FunnelChartProps) {
  const qs = buildQueryString(from, to, version)

  const { data, isLoading, isError, error } = useQuery<FunnelResponse>({
    queryKey: ['funnel', formIdOrSlug, toIsoString(from), toIsoString(to), version],
    queryFn: () =>
      formClient.get<FunnelResponse>(
        `/v1/admin/forms/${formIdOrSlug}/funnel?${qs}`,
      ),
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <Stack gap="xs">
        <Skeleton height={24} width={200} />
        <Skeleton height={200} radius="md" />
        <Skeleton height={20} width={120} />
      </Stack>
    )
  }

  if (isError) {
    return (
      <Alert
        icon={<IconAlertCircle size={16} />}
        title="Failed to load funnel"
        color="red"
        variant="light"
      >
        {error instanceof Error ? error.message : 'An unexpected error occurred.'}
      </Alert>
    )
  }

  if (!data || data.visitors === 0) {
    return (
      <Paper withBorder p="xl" radius="md">
        <Stack align="center" gap="xs">
          <IconUsers size={32} color="var(--mantine-color-dimmed)" />
          <Text size="sm" c="dimmed" ta="center">
            No visitors recorded in the selected date range.
          </Text>
        </Stack>
      </Paper>
    )
  }

  const chartData = [
    { label: 'Visitors', value: data.visitors },
    { label: 'Submit Attempts', value: data.submitAttempts },
    { label: 'Submit OK', value: data.submitOk },
  ]

  const conversionPct = (data.conversionRate * 100).toFixed(1)

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Text fw={600} size="sm">
          Conversion Funnel
        </Text>
        <Badge color="teal" variant="light" size="lg">
          {conversionPct}% conversion
        </Badge>
      </Group>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 24, bottom: 0, left: 100 }}
        >
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 12 }}
            width={96}
          />
          <Tooltip
            formatter={(value) => {
              const n = typeof value === 'number' ? value : Number(value ?? 0)
              return [n.toLocaleString(), 'Count'] as [string, string]
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={36}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <Group gap="xl" justify="center">
        {chartData.map((item) => (
          <Stack key={item.label} gap={2} align="center">
            <Text fw={700} size="lg">
              {item.value.toLocaleString()}
            </Text>
            <Text size="xs" c="dimmed">
              {item.label}
            </Text>
          </Stack>
        ))}
      </Group>
    </Stack>
  )
}
