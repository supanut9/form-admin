"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Stack,
  Title,
  Text,
  Group,
  Button,
  Table,
  Alert,
  Skeleton,
  Anchor,
  Badge,
  Paper,
  Center,
  Pagination,
} from "@mantine/core";
import {
  IconExternalLink,
  IconAlertCircle,
  IconReceipt2,
  IconSettings,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import {
  createPortalSession,
  listBillingEvents,
  humanizeBillingEvent,
  type BillingEvent,
} from "@/lib/workspaces";

// ── Helpers ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function eventBadgeColor(type: string): string {
  if (type.includes("succeeded") || type.includes("completed")) return "green";
  if (type.includes("failed") || type.includes("deleted")) return "red";
  if (type.includes("updated") || type.includes("upcoming")) return "yellow";
  if (type.includes("refunded")) return "orange";
  return "blue";
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function BillingPage({ params }: PageProps) {
  const { slug } = use(params);
  const [page, setPage] = useState(1);
  const offset = (page - 1) * PAGE_SIZE;

  const {
    data: eventsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["billing-events", slug, page],
    queryFn: () => listBillingEvents(slug, { limit: PAGE_SIZE, offset }),
    staleTime: 30_000,
  });

  const portalM = useMutation({
    mutationFn: () => createPortalSession(slug),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: () => {
      notifications.show({
        title: "Could not open billing portal",
        message: "Please try again or contact support.",
        color: "red",
      });
    },
  });

  const totalPages = Math.ceil((eventsData?.total ?? 0) / PAGE_SIZE);

  return (
    <Stack gap="lg">
      {/* Header + portal button */}
      <Group justify="space-between" align="flex-start">
        <Stack gap={2}>
          <Title order={2}>Billing</Title>
          <Text c="dimmed" size="sm">
            Manage your subscription, invoices, and payment methods.
          </Text>
        </Stack>
        <Button
          leftSection={<IconSettings size={16} />}
          variant="light"
          loading={portalM.isPending}
          onClick={() => portalM.mutate()}
        >
          Manage billing
        </Button>
      </Group>

      {/* Info about portal */}
      <Alert icon={<IconExternalLink size={16} />} color="blue" variant="light">
        Click <strong>Manage billing</strong> to update your payment method, download
        invoices, or cancel your subscription via the Stripe Customer Portal.
      </Alert>

      {/* Billing events */}
      <Stack gap="sm">
        <Title order={4}>Billing history</Title>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Could not load billing history">
            The billing events API may not be available yet.
          </Alert>
        )}

        {isLoading ? (
          <Stack gap="xs">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height={48} radius="sm" />
            ))}
          </Stack>
        ) : !eventsData || eventsData.items.length === 0 ? (
          <Paper withBorder p="xl" radius="md">
            <Center>
              <Stack align="center" gap="xs">
                <IconReceipt2 size={40} color="var(--mantine-color-gray-5)" stroke={1.2} />
                <Text c="dimmed" size="sm">
                  No billing events yet. They will appear here once your subscription is
                  active.
                </Text>
              </Stack>
            </Center>
          </Paper>
        ) : (
          <>
            <Table highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Event</Table.Th>
                  <Table.Th>Stripe event ID</Table.Th>
                  <Table.Th style={{ width: 80 }} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {eventsData.items.map((event: BillingEvent) => (
                  <Table.Tr key={event.id}>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {new Date(event.createdAt).toLocaleString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={eventBadgeColor(event.type)} variant="light" size="sm">
                        {humanizeBillingEvent(event.type)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed" ff="monospace">
                        {event.stripeEventId ?? "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {event.stripeDashboardUrl && (
                        <Anchor
                          href={event.stripeDashboardUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="xs"
                        >
                          <Group gap={4}>
                            View
                            <IconExternalLink size={12} />
                          </Group>
                        </Anchor>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {totalPages > 1 && (
              <Group justify="center" mt="sm">
                <Pagination
                  value={page}
                  onChange={setPage}
                  total={totalPages}
                  size="sm"
                />
              </Group>
            )}
          </>
        )}
      </Stack>
    </Stack>
  );
}
