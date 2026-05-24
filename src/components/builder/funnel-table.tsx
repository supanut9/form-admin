'use client'

/**
 * FunnelTable — per-page drop-off breakdown.
 *
 * Props:
 *   formIdOrSlug  — passed directly to the admin funnel endpoint
 *   from / to     — date range (inclusive)
 *   version       — optional form version filter
 *
 * Data source: GET /v1/admin/forms/:formIdOrSlug/funnel
 *
 * Rows: pageId | enters | exits | drop-off %
 * Sorted by drop-off descending (worst pages float to top).
 *
 * L13 (analytics page) imports this component directly. Do not move it.
 */

import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Badge,
  Paper,
  Skeleton,
  Stack,
  Table,
  Text,
} from '@mantine/core'
import { IconAlertCircle, IconFileText } from '@tabler/icons-react'
import { formClient } from '@/lib/form-client'
import type { FunnelChartProps } from './funnel-chart'

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

interface PageRow {
  pageId: string
  enter: number
  exit: number
  dropOff: number   // absolute count
  dropOffPct: number // 0–100
}

// FunnelTable accepts the same props as FunnelChart
export type FunnelTableProps = FunnelChartProps

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

function toRows(pages: FunnelResponse['pages']): PageRow[] {
  return pages
    .map((p) => {
      const dropOff = Math.max(0, p.enter - p.exit)
      const dropOffPct = p.enter > 0 ? (dropOff / p.enter) * 100 : 0
      return { pageId: p.pageId, enter: p.enter, exit: p.exit, dropOff, dropOffPct }
    })
    .sort((a, b) => b.dropOffPct - a.dropOffPct)
}

function dropOffColor(pct: number): string {
  if (pct >= 60) return 'red'
  if (pct >= 30) return 'orange'
  return 'teal'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FunnelTable({ formIdOrSlug, from, to, version }: FunnelTableProps) {
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
        <Skeleton height={36} radius="sm" />
        <Skeleton height={36} radius="sm" />
        <Skeleton height={36} radius="sm" />
      </Stack>
    )
  }

  if (isError) {
    return (
      <Alert
        icon={<IconAlertCircle size={16} />}
        title="Failed to load page breakdown"
        color="red"
        variant="light"
      >
        {error instanceof Error ? error.message : 'An unexpected error occurred.'}
      </Alert>
    )
  }

  if (!data || data.visitors === 0 || data.pages.length === 0) {
    return (
      <Paper withBorder p="xl" radius="md">
        <Stack align="center" gap="xs">
          <IconFileText size={32} color="var(--mantine-color-dimmed)" />
          <Text size="sm" c="dimmed" ta="center">
            No page data recorded in the selected date range.
          </Text>
        </Stack>
      </Paper>
    )
  }

  const rows = toRows(data.pages)

  return (
    <Stack gap="sm">
      <Text fw={600} size="sm">
        Page-level Drop-off
      </Text>
      <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
        <Table striped highlightOnHover withColumnBorders={false}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Page</Table.Th>
              <Table.Th ta="right">Enters</Table.Th>
              <Table.Th ta="right">Exits</Table.Th>
              <Table.Th ta="right">Drop-off</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr key={row.pageId}>
                <Table.Td>
                  <Text size="sm" ff="monospace">
                    {row.pageId}
                  </Text>
                </Table.Td>
                <Table.Td ta="right">
                  <Text size="sm">{row.enter.toLocaleString()}</Text>
                </Table.Td>
                <Table.Td ta="right">
                  <Text size="sm">{row.exit.toLocaleString()}</Text>
                </Table.Td>
                <Table.Td ta="right">
                  <Badge
                    color={dropOffColor(row.dropOffPct)}
                    variant="light"
                    size="sm"
                  >
                    {row.dropOffPct.toFixed(1)}%
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  )
}
