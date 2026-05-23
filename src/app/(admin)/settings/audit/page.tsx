"use client";

import { useEffect, useState } from "react";
import {
  Title,
  Table,
  Text,
  Stack,
  Skeleton,
  Group,
  TextInput,
  Select,
  Button,
  Pagination,
  Code,
  Modal,
  Badge,
  CopyButton,
  Anchor,
  ScrollArea,
  Divider,
  Tooltip,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconCopy, IconExternalLink } from "@tabler/icons-react";
import Link from "next/link";
import { formClient } from "@/lib/form-client";

interface AuditEntry {
  id: string;
  actor_account_id: string | null;
  action: string;
  subject_type: string;
  subject_id: string;
  diff_json: unknown | null;
  at: string;
}

interface AuditListResponse {
  data: AuditEntry[];
  total: number;
  page: number;
  per_page: number;
}

const SUBJECT_TYPES = [
  { value: "Form", label: "Form" },
  { value: "FormVersion", label: "FormVersion" },
  { value: "Submission", label: "Submission" },
  { value: "FormEvent", label: "FormEvent" },
  { value: "Webhook", label: "Webhook" },
  { value: "WebhookDelivery", label: "WebhookDelivery" },
  { value: "ApiToken", label: "ApiToken" },
  { value: "Role", label: "Role" },
  { value: "AccountRole", label: "AccountRole" },
];

const ACTION_COLOR: Record<string, string> = {
  create: "green",
  publish: "green",
  grant: "green",
  update: "blue",
  rotate_secret: "blue",
  delete: "red",
  revoke: "red",
  archive: "yellow",
  unarchive: "blue",
  replay: "indigo",
};

function actionColor(action: string): string {
  // action looks like "form.create" / "webhook.delivery.replay"
  const verb = action.split(".").pop() ?? action;
  return ACTION_COLOR[verb] ?? "gray";
}

/**
 * Returns an in-admin destination for the audit row's subject, or null when
 * there's no useful page (e.g. AccountRole has no detail view).
 */
function subjectLink(entry: AuditEntry): { href: string; label: string } | null {
  const { subject_type, subject_id, diff_json } = entry;
  const diff = (diff_json ?? null) as Record<string, unknown> | null;
  const formId =
    typeof diff?.form_id === "string" ? (diff.form_id as string) : null;

  switch (subject_type) {
    case "Form":
      return { href: `/forms/${subject_id}/builder`, label: "Open builder" };
    case "FormVersion":
      return formId
        ? { href: `/forms/${formId}/versions`, label: "View versions" }
        : null;
    case "Submission":
      return formId
        ? { href: `/forms/${formId}/submissions`, label: "View submissions" }
        : null;
    case "FormEvent":
      return { href: "/events", label: "Events" };
    case "Webhook":
    case "WebhookDelivery":
      return { href: "/settings/webhooks", label: "Webhooks" };
    case "ApiToken":
      return { href: "/settings/api-tokens", label: "API tokens" };
    case "Role":
    case "AccountRole":
      return { href: "/settings/roles", label: "Roles" };
    default:
      return null;
  }
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const perPage = 50;
  const [loading, setLoading] = useState(false);

  const [actorId, setActorId] = useState("");
  const [subjectType, setSubjectType] = useState<string | null>(null);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);

  const [selected, setSelected] = useState<AuditEntry | null>(null);

  const load = (currentPage = page) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(currentPage));
    params.set("per_page", String(perPage));
    if (actorId.trim()) params.set("actor_account_id", actorId.trim());
    if (subjectType) params.set("subject_type", subjectType);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    formClient
      .get<AuditListResponse>(`/admin/audit?${params.toString()}`)
      .then((res) => {
        setEntries(res.data);
        setTotal(res.total);
      })
      .catch(() => {
        setEntries([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(1);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actorId, subjectType, from, to]);

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <Stack gap="md" p="md">
      <Stack gap={2}>
        <Title order={3}>Audit Log</Title>
        <Text size="sm" c="dimmed">
          Append-only record of every admin mutation. Click a row to inspect
          the diff and jump to the affected subject.
        </Text>
      </Stack>

      <Group gap="sm" wrap="wrap">
        <TextInput
          placeholder="Actor account UUID"
          value={actorId}
          onChange={(e) => setActorId(e.currentTarget.value)}
          style={{ width: 260 }}
          size="sm"
        />
        <Select
          placeholder="Subject type"
          clearable
          data={SUBJECT_TYPES}
          value={subjectType}
          onChange={setSubjectType}
          size="sm"
          style={{ width: 200 }}
        />
        <DateInput
          placeholder="From"
          value={from}
          onChange={setFrom}
          clearable
          size="sm"
          style={{ width: 140 }}
        />
        <DateInput
          placeholder="To"
          value={to}
          onChange={setTo}
          clearable
          size="sm"
          style={{ width: 140 }}
        />
        <Button size="sm" variant="subtle" onClick={() => load(1)}>
          Refresh
        </Button>
        <Text size="xs" c="dimmed" ml="auto">
          {total} row{total === 1 ? "" : "s"}
        </Text>
      </Group>

      {loading ? (
        <Stack gap={8}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={36} radius="sm" />
          ))}
        </Stack>
      ) : entries.length === 0 ? (
        <Text c="dimmed">No audit entries found.</Text>
      ) : (
        <>
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>When</Table.Th>
                <Table.Th>Action</Table.Th>
                <Table.Th>Subject</Table.Th>
                <Table.Th>Actor</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {entries.map((e) => (
                <Table.Tr
                  key={e.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelected(e)}
                >
                  <Table.Td>
                    <Stack gap={0}>
                      <Text size="sm">
                        {new Date(e.at).toLocaleString()}
                      </Text>
                      <Text size="xs" c="dimmed" ff="monospace">
                        {e.id.slice(0, 8)}…
                      </Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="sm" color={actionColor(e.action)} variant="light">
                      {e.action}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={0}>
                      <Text size="sm">{e.subject_type}</Text>
                      <Text size="xs" c="dimmed" ff="monospace">
                        {e.subject_id.length > 24
                          ? `${e.subject_id.slice(0, 8)}…`
                          : e.subject_id}
                      </Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" ff="monospace" c={e.actor_account_id ? undefined : "dimmed"}>
                      {e.actor_account_id ? `${e.actor_account_id.slice(0, 8)}…` : "system"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {e.diff_json ? (
                      <Text size="xs" c="blue">
                        view diff
                      </Text>
                    ) : (
                      <Text size="xs" c="dimmed">
                        no diff
                      </Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          <Group justify="center">
            <Pagination total={totalPages} value={page} onChange={setPage} size="sm" />
          </Group>
        </>
      )}

      <Modal
        opened={!!selected}
        onClose={() => setSelected(null)}
        title={
          selected ? (
            <Group gap={6}>
              <Badge color={actionColor(selected.action)} variant="light">
                {selected.action}
              </Badge>
              <Text size="sm" c="dimmed">
                {new Date(selected.at).toLocaleString()}
              </Text>
            </Group>
          ) : (
            "Audit"
          )
        }
        size="lg"
      >
        {selected && (
          <Stack gap="sm">
            <Group gap="lg" wrap="wrap">
              <Stack gap={0}>
                <Text size="xs" c="dimmed">
                  Subject type
                </Text>
                <Text size="sm">{selected.subject_type}</Text>
              </Stack>
              <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                <Text size="xs" c="dimmed">
                  Subject id
                </Text>
                <Group gap={4} wrap="nowrap">
                  <Code style={{ wordBreak: "break-all" }}>{selected.subject_id}</Code>
                  <CopyButton value={selected.subject_id}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? "Copied" : "Copy"}>
                        <Button
                          size="xs"
                          variant="subtle"
                          onClick={copy}
                          leftSection={<IconCopy size={12} />}
                        >
                          {copied ? "Copied" : "Copy"}
                        </Button>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
              </Stack>
            </Group>
            <Stack gap={0}>
              <Text size="xs" c="dimmed">
                Actor
              </Text>
              <Code style={{ wordBreak: "break-all" }}>
                {selected.actor_account_id ?? "system (no logged-in actor)"}
              </Code>
            </Stack>

            {(() => {
              const link = subjectLink(selected);
              return link ? (
                <Anchor
                  component={Link}
                  href={link.href}
                  size="sm"
                  style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <IconExternalLink size={14} /> {link.label}
                </Anchor>
              ) : null;
            })()}

            <Divider label="Diff" labelPosition="left" />
            {selected.diff_json ? (
              <ScrollArea h={320}>
                <Code block style={{ whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(selected.diff_json, null, 2)}
                </Code>
              </ScrollArea>
            ) : (
              <Text size="sm" c="dimmed">
                No diff captured for this action.
              </Text>
            )}

            <Group justify="space-between" pt="sm">
              <Text size="xs" c="dimmed">
                Entry {selected.id}
              </Text>
              <Button variant="default" onClick={() => setSelected(null)}>
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
