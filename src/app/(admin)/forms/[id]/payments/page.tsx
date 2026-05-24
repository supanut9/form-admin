"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  Badge,
  Text,
  Stack,
  Group,
  Anchor,
  Select,
  Center,
  Alert,
  Pagination,
  Box,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconAlertCircle, IconCreditCard } from "@tabler/icons-react";
import Link from "next/link";
import {
  listPayments,
  formatAmount,
  type PaymentStatus,
} from "@/lib/payments";

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "succeeded", label: "Succeeded" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const STATUS_COLORS: Record<PaymentStatus, string> = {
  pending: "yellow",
  succeeded: "green",
  failed: "red",
  refunded: "gray",
};

// ── Component ─────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PaymentsPage({ params }: PageProps) {
  // Unwrap params — Next.js 15 async params
  const [formId, setFormId] = useState<string | null>(null);

  // Extract formId from params promise on first render
  if (!formId) {
    params.then((p) => setFormId(p.id));
  }

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);

  const from = dateFrom ?? undefined;
  const to = dateTo ?? undefined;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["payments", formId, page, status, from ?? null, to ?? null],
    queryFn: () =>
      listPayments(formId!, {
        status: (status as PaymentStatus) || undefined,
        from,
        to,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
    enabled: formId != null,
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  // ── Toolbar ────────────────────────────────────────────────────────────────
  const toolbar = (
    <Group gap="sm" align="flex-end">
      <Select
        label="Status"
        size="xs"
        w={160}
        value={status}
        onChange={(v) => {
          setStatus(v ?? "");
          setPage(1);
        }}
        data={STATUS_OPTIONS}
      />
      <DateInput
        label="From"
        size="xs"
        w={130}
        clearable
        value={dateFrom as string}
        onChange={(d: string | null) => {
          setDateFrom(d);
          setPage(1);
        }}
        placeholder="Start date"
      />
      <DateInput
        label="To"
        size="xs"
        w={130}
        clearable
        value={dateTo as string}
        onChange={(d: string | null) => {
          setDateTo(d);
          setPage(1);
        }}
        placeholder="End date"
      />
    </Group>
  );

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading || !formId) {
    return (
      <Stack gap="md" p="md">
        <Stack gap={4}>
          <Text fw={600}>Payments</Text>
        </Stack>
        {toolbar}
        <Center py="xl">
          <Text c="dimmed">Loading payments…</Text>
        </Center>
      </Stack>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <Stack gap="md" p="md">
        {toolbar}
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          title="Failed to load payments"
        >
          {error instanceof Error ? error.message : "Unknown error"}
        </Alert>
      </Stack>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!data || data.items.length === 0) {
    return (
      <Stack gap="md" p="md">
        {toolbar}
        <Center py="xl">
          <Stack align="center" gap="xs">
            <IconCreditCard
              size={48}
              color="var(--mantine-color-gray-5)"
              stroke={1.2}
            />
            <Text c="dimmed" fw={500}>
              No payments yet. Add a payment field to start collecting.
            </Text>
            <Anchor
              component={Link}
              href={`/forms/${formId}/builder`}
              size="sm"
            >
              Open form builder
            </Anchor>
          </Stack>
        </Center>
      </Stack>
    );
  }

  // ── Table ──────────────────────────────────────────────────────────────────
  return (
    <Stack gap="md" p="md">
      <Stack gap={4}>
        <Text fw={600}>Payments</Text>
        <Text size="sm" c="dimmed">
          {data.total} payment{data.total === 1 ? "" : "s"} — read-only view.
          Use the Stripe Dashboard to issue refunds.
        </Text>
      </Stack>

      {toolbar}

      <Box style={{ overflowX: "auto" }}>
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Amount</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Submitted</Table.Th>
              <Table.Th>Captured</Table.Th>
              <Table.Th>Stripe</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.items.map((row) => (
              <Table.Tr key={row.id}>
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {formatAmount(row.amountMinor, row.currency)}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {row.id.slice(0, 8)}…
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge
                    size="sm"
                    color={STATUS_COLORS[row.status]}
                    variant="light"
                  >
                    {row.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">
                    {new Date(row.submission.submittedAt).toLocaleString()}
                  </Text>
                </Table.Td>
                <Table.Td>
                  {row.capturedAt ? (
                    <Text size="sm">
                      {new Date(row.capturedAt).toLocaleString()}
                    </Text>
                  ) : (
                    <Text size="xs" c="dimmed">
                      —
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <StripeLink paymentId={row.id} intentId={row.stripePaymentIntentId} />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Box>

      {totalPages > 1 && (
        <Group justify="center">
          <Pagination value={page} onChange={setPage} total={totalPages} size="sm" />
        </Group>
      )}
    </Stack>
  );
}

// ── Stripe link component ─────────────────────────────────────────────────────
// Fetches full detail (which includes stripe_dashboard_url) on click.

function StripeLink({
  paymentId,
  intentId,
}: {
  paymentId: string;
  intentId: string;
}) {
  const { data } = useQuery({
    queryKey: ["payment-detail", paymentId],
    queryFn: () =>
      import("@/lib/payments").then((m) => m.getPayment(paymentId)),
    enabled: false, // only fetched when manually triggered
    staleTime: 60_000,
  });

  const url =
    data?.stripe_dashboard_url ??
    `https://dashboard.stripe.com/test/payments/${intentId}`;

  return (
    <Anchor
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      size="xs"
      style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
    >
      <IconCreditCard size={12} />
      Dashboard
    </Anchor>
  );
}
