"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  Group,
  Badge,
  Text,
  Code,
  Stack,
  Modal,
  ScrollArea,
  Title,
  Button,
  Pagination,
  Box,
  Center,
  Alert,
  Anchor,
  Switch,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconInbox,
  IconAlertCircle,
  IconDownload,
  IconArrowBackUp,
  IconTrash,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { formClient } from "@/lib/form-client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface SubmissionRow {
  id: string;
  form_id: string;
  version: number;
  account_id: string | null;
  anonymous_token: string | null;
  payload: Record<string, unknown>;
  submitted_at: string;
  source: string;
  status: string;
  deleted_at: string | null;
}

interface SubmissionsListResponse {
  total: number;
  limit: number;
  offset: number;
  form: { id: string; slug: string | null; title: string; current_version: number };
  items: SubmissionRow[];
}

const PAGE_SIZE = 25;

export function SubmissionsTable({ formId }: { formId: string }) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [selected, setSelected] = useState<SubmissionRow | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["submissions", formId, page, includeDeleted],
    queryFn: () =>
      formClient.get<SubmissionsListResponse>(
        `/admin/forms/${formId}/submissions?limit=${PAGE_SIZE}&offset=${
          (page - 1) * PAGE_SIZE
        }${includeDeleted ? "&include_deleted=true" : ""}`,
      ),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      formClient.del<void>(`/admin/submissions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submissions", formId] });
      notifications.show({ message: "Submission deleted", color: "green" });
    },
    onError: (err) =>
      notifications.show({
        title: "Delete failed",
        message: err instanceof Error ? err.message : "Unknown error",
        color: "red",
      }),
  });

  const restoreMut = useMutation({
    mutationFn: (id: string) =>
      formClient.post<void>(`/admin/submissions/${id}/restore`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submissions", formId] });
      notifications.show({ message: "Submission restored", color: "green" });
    },
    onError: (err) =>
      notifications.show({
        title: "Restore failed",
        message: err instanceof Error ? err.message : "Unknown error",
        color: "red",
      }),
  });

  // ── Top toolbar (shown on every render — loading, empty, populated) ──────
  const toolbar = (
    <Group justify="space-between" align="center">
      <Switch
        size="xs"
        checked={includeDeleted}
        label="Show deleted"
        onChange={(e) => {
          setIncludeDeleted(e.currentTarget.checked);
          setPage(1);
        }}
      />
      {data && (
        <Text size="xs" c="dimmed">
          Form: <strong>{data.form.title}</strong> (v{data.form.current_version})
        </Text>
      )}
    </Group>
  );

  if (isLoading) {
    return (
      <Stack gap="sm">
        {toolbar}
        <Center py="xl">
          <Text c="dimmed">Loading submissions…</Text>
        </Center>
      </Stack>
    );
  }

  if (isError) {
    return (
      <Stack gap="sm">
        {toolbar}
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          title="Failed to load submissions"
        >
          {error instanceof Error ? error.message : "Unknown error"}
        </Alert>
      </Stack>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <Stack gap="sm">
        {toolbar}
        <Center py="xl">
          <Stack align="center" gap="xs">
            <IconInbox size={48} color="var(--mantine-color-gray-5)" />
            <Text c="dimmed">
              {includeDeleted
                ? "No submissions match the current filter."
                : "No submissions yet."}
            </Text>
            <Text size="xs" c="dimmed">
              Submissions to <Code>{data?.form.slug ?? formId}</Code> will appear here.
            </Text>
          </Stack>
        </Center>
      </Stack>
    );
  }

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <Stack gap="sm">
      {toolbar}
      <Text size="sm" c="dimmed">
        {data.total} submission{data.total === 1 ? "" : "s"} • showing{" "}
        {data.items.length}
        {includeDeleted ? " (deleted included)" : ""}
      </Text>

      <Box style={{ overflowX: "auto" }}>
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Submitted</Table.Th>
              <Table.Th>Identity</Table.Th>
              <Table.Th>Version</Table.Th>
              <Table.Th>Source</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Preview</Table.Th>
              <Table.Th style={{ width: 80 }} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.items.map((row) => {
              const keys = Object.keys(row.payload);
              const preview = keys
                .slice(0, 3)
                .map((k) => `${k}=${String((row.payload as Record<string, unknown>)[k]).slice(0, 30)}`)
                .join("; ");
              const isDeleted = !!row.deleted_at;
              return (
                <Table.Tr
                  key={row.id}
                  style={{
                    cursor: "pointer",
                    opacity: isDeleted ? 0.55 : 1,
                  }}
                  onClick={() => {
                    setSelected(row);
                    open();
                  }}
                >
                  <Table.Td>
                    <Text
                      size="sm"
                      style={
                        isDeleted ? { textDecoration: "line-through" } : undefined
                      }
                    >
                      {new Date(row.submitted_at).toLocaleString()}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {row.id.slice(0, 8)}…
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {row.account_id ? (
                      <Badge size="sm" color="indigo" variant="light">
                        user
                      </Badge>
                    ) : (
                      <Badge size="sm" color="gray" variant="light">
                        anon
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">v{row.version}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">
                      {row.source}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {isDeleted ? (
                      <Badge size="sm" color="red" variant="light">
                        deleted
                      </Badge>
                    ) : (
                      <Badge
                        size="sm"
                        color={row.status === "submitted" ? "blue" : "gray"}
                        variant="light"
                      >
                        {row.status}
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" lineClamp={1} style={{ maxWidth: 360 }}>
                      {preview || <em>empty payload</em>}
                    </Text>
                  </Table.Td>
                  <Table.Td onClick={(e) => e.stopPropagation()}>
                    {isDeleted ? (
                      <Tooltip label="Restore">
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="green"
                          loading={restoreMut.isPending && restoreMut.variables === row.id}
                          onClick={() => restoreMut.mutate(row.id)}
                          aria-label="Restore submission"
                        >
                          <IconArrowBackUp size={14} />
                        </ActionIcon>
                      </Tooltip>
                    ) : (
                      <Tooltip label="Delete">
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="red"
                          loading={deleteMut.isPending && deleteMut.variables === row.id}
                          onClick={() => {
                            if (
                              confirm(
                                "Soft-delete this submission? You can restore it later from this view.",
                              )
                            ) {
                              deleteMut.mutate(row.id);
                            }
                          }}
                          aria-label="Delete submission"
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Box>

      {totalPages > 1 && (
        <Group justify="center">
          <Pagination
            value={page}
            onChange={setPage}
            total={totalPages}
            size="sm"
          />
        </Group>
      )}

      <Modal
        opened={opened}
        onClose={close}
        size="lg"
        title={
          selected ? (
            <Stack gap={2}>
              <Title order={4}>Submission</Title>
              <Text size="xs" c="dimmed">
                {selected.id}
              </Text>
            </Stack>
          ) : (
            "Submission"
          )
        }
      >
        {selected && (
          <Stack gap="sm">
            <Group gap="lg" wrap="wrap">
              <Stack gap={0}>
                <Text size="xs" c="dimmed">
                  Submitted
                </Text>
                <Text size="sm">
                  {new Date(selected.submitted_at).toLocaleString()}
                </Text>
              </Stack>
              <Stack gap={0}>
                <Text size="xs" c="dimmed">
                  Version
                </Text>
                <Text size="sm">v{selected.version}</Text>
              </Stack>
              <Stack gap={0}>
                <Text size="xs" c="dimmed">
                  Source
                </Text>
                <Text size="sm">{selected.source}</Text>
              </Stack>
              <Stack gap={0}>
                <Text size="xs" c="dimmed">
                  Status
                </Text>
                <Text size="sm">{selected.status}</Text>
              </Stack>
            </Group>
            <Stack gap={2}>
              <Text size="xs" c="dimmed">
                Identity
              </Text>
              <Code block>
                {selected.account_id
                  ? `account_id: ${selected.account_id}`
                  : selected.anonymous_token
                    ? `anonymous_token: ${selected.anonymous_token}`
                    : "(none)"}
              </Code>
            </Stack>
            <Stack gap={2}>
              <Text size="xs" c="dimmed">
                Payload
              </Text>
              <PayloadView payload={selected.payload} />
            </Stack>
            <Group justify="flex-end">
              <Button variant="default" onClick={close}>
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

// ── Payload renderer ─────────────────────────────────────────────────────────

function PayloadView({ payload }: { payload: Record<string, unknown> }) {
  const entries = Object.entries(payload);
  if (entries.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        (empty payload)
      </Text>
    );
  }

  return (
    <Stack gap="xs">
      {entries.map(([key, value]) => (
        <Stack key={key} gap={2}>
          <Text size="xs" c="dimmed" ff="monospace">
            {key}
          </Text>
          <PayloadValue value={value} />
        </Stack>
      ))}
    </Stack>
  );
}

function PayloadValue({ value }: { value: unknown }) {
  // Lone file_id (UUID string) → render as download button.
  if (typeof value === "string" && UUID_RE.test(value)) {
    return <FileDownloadButton fileId={value} />;
  }
  if (Array.isArray(value)) {
    return (
      <Stack gap={4}>
        {value.map((v, i) => (
          <PayloadValue key={i} value={v} />
        ))}
      </Stack>
    );
  }
  return (
    <ScrollArea.Autosize mah={120}>
      <Code block style={{ whiteSpace: "pre-wrap" }}>
        {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
      </Code>
    </ScrollArea.Autosize>
  );
}

function FileDownloadButton({ fileId }: { fileId: string }) {
  async function open() {
    try {
      const res = await formClient.get<{ url: string; filename: string }>(
        `/admin/files/${fileId}/download`,
      );
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      notifications.show({
        title: "Download failed",
        message: err instanceof Error ? err.message : "Unknown error",
        color: "red",
      });
    }
  }
  return (
    <Group gap={6}>
      <Code>{fileId.slice(0, 8)}…</Code>
      <Anchor
        component="button"
        onClick={open}
        size="xs"
        style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
      >
        <IconDownload size={12} /> Download
      </Anchor>
    </Group>
  );
}
