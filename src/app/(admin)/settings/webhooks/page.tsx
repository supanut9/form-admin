"use client";

import { useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Title,
  Table,
  Badge,
  Text,
  Stack,
  Group,
  Button,
  Modal,
  ActionIcon,
  Tooltip,
  Anchor,
  TextInput,
  Select,
  Switch,
  Code,
  Alert,
  Skeleton,
  CopyButton,
  MultiSelect,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCopy,
  IconRefresh,
  IconTrash,
  IconPlus,
  IconKey,
  IconWebhook,
} from "@tabler/icons-react";
import { formClient } from "@/lib/form-client";

interface WebhookRow {
  id: string;
  form_id: string;
  url: string;
  events: string[];
  active: boolean;
  last_delivery_at: string | null;
  created_at: string;
}

interface DeliveryRow {
  id: string;
  webhook_id: string;
  submission_id: string;
  attempt: number;
  status: "pending" | "delivered" | "failed";
  response_code: number | null;
  response_body_excerpt: string | null;
  scheduled_at: string;
}

interface DeliveriesResp {
  total: number;
  limit: number;
  offset: number;
  items: DeliveryRow[];
}

interface FormSummary {
  id: string;
  title: string;
  slug: string | null;
  archived_at: string | null;
}

function statusColor(s: DeliveryRow["status"]): string {
  switch (s) {
    case "delivered":
      return "green";
    case "pending":
      return "blue";
    case "failed":
      return "red";
    default:
      return "gray";
  }
}

// ── Deliveries modal ─────────────────────────────────────────────────────────

function DeliveriesModal({
  webhookId,
  opened,
  onClose,
}: {
  webhookId: string | null;
  opened: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    enabled: !!webhookId && opened,
    queryKey: ["webhook-deliveries", webhookId],
    queryFn: () =>
      formClient.get<DeliveriesResp>(`/admin/webhooks/${webhookId}/deliveries`),
    refetchInterval: 4000,
  });

  const replayMut = useMutation({
    mutationFn: (deliveryId: string) =>
      formClient.post<{ delivery_id: string }>(
        `/admin/deliveries/${deliveryId}/replay`,
      ),
    onSuccess: (res) => {
      notifications.show({
        color: "green",
        message: `Replay queued (delivery ${res.delivery_id.slice(0, 8)}…)`,
      });
      qc.invalidateQueries({ queryKey: ["webhook-deliveries", webhookId] });
    },
    onError: (err) =>
      notifications.show({
        color: "red",
        message: err instanceof Error ? err.message : "Replay failed",
      }),
  });

  const items = data?.items ?? [];

  return (
    <Modal opened={opened} onClose={onClose} title="Recent deliveries" size="xl">
      {isLoading ? (
        <Stack gap={6}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={32} radius="sm" />
          ))}
        </Stack>
      ) : items.length === 0 ? (
        <Text c="dimmed">No deliveries yet for this webhook.</Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Attempt</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>HTTP</Table.Th>
              <Table.Th>Scheduled</Table.Th>
              <Table.Th>Response</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((d) => (
              <Table.Tr key={d.id}>
                <Table.Td>#{d.attempt}</Table.Td>
                <Table.Td>
                  <Badge color={statusColor(d.status)} size="sm">
                    {d.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="xs">{d.response_code ?? "—"}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs">
                    {new Date(d.scheduled_at).toLocaleString()}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text
                    size="xs"
                    c="dimmed"
                    style={{
                      maxWidth: 240,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {d.response_body_excerpt ?? ""}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Tooltip label="Replay this delivery">
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      loading={replayMut.isPending}
                      onClick={() => replayMut.mutate(d.id)}
                    >
                      <IconRefresh size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Modal>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function WebhooksPage() {
  const qc = useQueryClient();
  const [createOpen, createCtl] = useDisclosure(false);
  const [secretReveal, setSecretReveal] = useState<{
    webhookId: string;
    url: string;
    secret: string;
  } | null>(null);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(
    null,
  );
  const [deliveriesOpen, deliveriesCtl] = useDisclosure(false);

  const webhooksQ = useQuery({
    queryKey: ["webhooks"],
    queryFn: () => formClient.get<WebhookRow[]>("/admin/webhooks"),
  });

  const formsQ = useQuery({
    queryKey: ["forms-for-webhooks"],
    queryFn: () => formClient.get<FormSummary[]>("/admin/forms"),
  });

  const formsById = useMemo(
    () => new Map((formsQ.data ?? []).map((f) => [f.id, f])),
    [formsQ.data],
  );

  const createForm = useForm({
    initialValues: {
      form_id: "",
      url: "",
      events: ["submitted"] as string[],
      active: true,
    },
    validate: {
      form_id: (v) => (v ? null : "Pick a form"),
      url: (v) => {
        try {
          const u = new URL(v);
          return u.protocol === "https:" || u.protocol === "http:"
            ? null
            : "Must be http(s)";
        } catch {
          return "Invalid URL";
        }
      },
      events: (v) => (v.length === 0 ? "Pick at least one event" : null),
    },
  });

  const createMut = useMutation({
    mutationFn: (vals: typeof createForm.values) =>
      formClient.post<WebhookRow & { secret: string }>("/admin/webhooks", {
        body: vals,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["webhooks"] });
      createCtl.close();
      setSecretReveal({
        webhookId: res.id,
        url: res.url,
        secret: res.secret,
      });
      createForm.reset();
    },
    onError: (err) =>
      notifications.show({
        title: "Create failed",
        message: err instanceof Error ? err.message : "Unknown error",
        color: "red",
      }),
  });

  const toggleActiveMut = useMutation({
    mutationFn: (vars: { id: string; active: boolean }) =>
      formClient.patch<WebhookRow>(`/admin/webhooks/${vars.id}`, {
        body: { active: vars.active },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      formClient.del<void>(`/admin/webhooks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks"] });
      notifications.show({ message: "Webhook deleted", color: "green" });
    },
    onError: (err) =>
      notifications.show({
        title: "Delete failed",
        message: err instanceof Error ? err.message : "Unknown error",
        color: "red",
      }),
  });

  const rotateMut = useMutation({
    mutationFn: (id: string) =>
      formClient.post<{ secret: string }>(
        `/admin/webhooks/${id}/rotate-secret`,
      ),
    onSuccess: (res, id) => {
      const w = (webhooksQ.data ?? []).find((x) => x.id === id);
      setSecretReveal({
        webhookId: id,
        url: w?.url ?? "",
        secret: res.secret,
      });
    },
    onError: (err) =>
      notifications.show({
        title: "Rotate failed",
        message: err instanceof Error ? err.message : "Unknown error",
        color: "red",
      }),
  });

  const webhooks = webhooksQ.data ?? [];

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <Stack gap={2}>
          <Title order={3}>Webhooks</Title>
          <Text size="sm" c="dimmed">
            POST to your URL on every submission. Body is signed with
            HMAC-SHA256 — verify with the <Code>X-Form-Signature</Code> header.
          </Text>
        </Stack>
        <Button
          leftSection={<IconPlus size={14} />}
          onClick={() => {
            createForm.reset();
            createCtl.open();
          }}
        >
          New webhook
        </Button>
      </Group>

      {webhooksQ.isError && (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          {webhooksQ.error instanceof Error
            ? webhooksQ.error.message
            : "Failed to load webhooks"}
        </Alert>
      )}

      {webhooksQ.isLoading ? (
        <Stack gap={8}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={40} radius="sm" />
          ))}
        </Stack>
      ) : webhooks.length === 0 ? (
        <Stack align="center" gap="xs" py="xl">
          <IconWebhook size={48} color="var(--mantine-color-gray-5)" />
          <Text c="dimmed">No webhooks yet.</Text>
        </Stack>
      ) : (
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Form</Table.Th>
              <Table.Th>URL</Table.Th>
              <Table.Th>Events</Table.Th>
              <Table.Th>Active</Table.Th>
              <Table.Th>Last delivery</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {webhooks.map((w) => {
              const f = formsById.get(w.form_id);
              return (
                <Table.Tr key={w.id}>
                  <Table.Td>
                    {f ? (
                      <Anchor href={`/forms/${w.form_id}/submissions`} size="sm">
                        {f.title}
                      </Anchor>
                    ) : (
                      <Text size="xs" c="dimmed">
                        {w.form_id.slice(0, 8)}…
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" ff="monospace" truncate maw={300}>
                      {w.url}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {w.events.map((e) => (
                        <Badge key={e} size="xs" variant="outline">
                          {e}
                        </Badge>
                      ))}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Switch
                      size="xs"
                      checked={w.active}
                      onChange={(e) =>
                        toggleActiveMut.mutate({
                          id: w.id,
                          active: e.currentTarget.checked,
                        })
                      }
                    />
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">
                      {w.last_delivery_at
                        ? new Date(w.last_delivery_at).toLocaleString()
                        : "Never"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={2}>
                      <Tooltip label="View deliveries">
                        <Button
                          size="xs"
                          variant="subtle"
                          onClick={() => {
                            setSelectedWebhookId(w.id);
                            deliveriesCtl.open();
                          }}
                        >
                          Deliveries
                        </Button>
                      </Tooltip>
                      <Tooltip label="Rotate secret">
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          onClick={() => {
                            if (
                              confirm(
                                "Rotating the secret invalidates the previous one. Continue?",
                              )
                            ) {
                              rotateMut.mutate(w.id);
                            }
                          }}
                        >
                          <IconKey size={14} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete webhook">
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="red"
                          onClick={() => {
                            if (confirm("Delete webhook? This is irreversible.")) {
                              deleteMut.mutate(w.id);
                            }
                          }}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}

      <DeliveriesModal
        webhookId={selectedWebhookId}
        opened={deliveriesOpen}
        onClose={() => {
          deliveriesCtl.close();
          setSelectedWebhookId(null);
        }}
      />

      {/* Create modal */}
      <Modal
        opened={createOpen}
        onClose={createCtl.close}
        title="New webhook"
        size="md"
      >
        <form
          onSubmit={createForm.onSubmit((vals) => createMut.mutate(vals))}
          noValidate
        >
          <Stack gap="sm">
            <Select
              label="Form"
              required
              data={(formsQ.data ?? []).map((f) => ({
                value: f.id,
                label: f.slug ? `${f.title} (/${f.slug})` : f.title,
              }))}
              searchable
              {...createForm.getInputProps("form_id")}
            />
            <TextInput
              label="Destination URL"
              placeholder="https://service.example.com/webhooks/forms"
              required
              {...createForm.getInputProps("url")}
            />
            <MultiSelect
              label="Events"
              data={[
                { value: "submitted", label: "submitted" },
                { value: "failed", label: "failed (delivery failures)" },
              ]}
              {...createForm.getInputProps("events")}
            />
            <Switch
              label="Active"
              {...createForm.getInputProps("active", { type: "checkbox" })}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={createCtl.close}>
                Cancel
              </Button>
              <Button type="submit" loading={createMut.isPending}>
                Create
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* One-shot secret reveal */}
      <Modal
        opened={!!secretReveal}
        onClose={() => setSecretReveal(null)}
        title="Webhook secret"
        size="md"
        withCloseButton={false}
      >
        {secretReveal && (
          <Stack gap="sm">
            <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
              Copy this secret now — it will not be shown again. Use it on the
              receiving end to verify the <Code>X-Form-Signature</Code> HMAC.
            </Alert>
            <Stack gap={2}>
              <Text size="xs" c="dimmed">
                Destination
              </Text>
              <Code>{secretReveal.url}</Code>
            </Stack>
            <Stack gap={2}>
              <Text size="xs" c="dimmed">
                Secret
              </Text>
              <Group>
                <Code style={{ flex: 1, wordBreak: "break-all" }}>
                  {secretReveal.secret}
                </Code>
                <CopyButton value={secretReveal.secret}>
                  {({ copied, copy }) => (
                    <Button
                      leftSection={<IconCopy size={14} />}
                      size="xs"
                      variant={copied ? "filled" : "default"}
                      onClick={copy}
                    >
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  )}
                </CopyButton>
              </Group>
            </Stack>
            <Group justify="flex-end">
              <Button onClick={() => setSecretReveal(null)}>I've saved it</Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
