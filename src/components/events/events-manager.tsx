"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Stack,
  Group,
  Button,
  Table,
  Badge,
  Modal,
  TextInput,
  Select,
  Textarea,
  Switch,
  Text,
  Code,
  ActionIcon,
  Tooltip,
  Center,
  Alert,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconPlus,
  IconTrash,
  IconCopy,
  IconAlertCircle,
  IconCalendarEvent,
} from "@tabler/icons-react";
import { formClient } from "@/lib/form-client";

interface EventRow {
  id: string;
  event_key: string;
  form_id: string;
  current_version: number;
  optional: boolean;
  description: string;
  created_at: string;
  updated_at: string;
}

interface FormSummary {
  id: string;
  title: string;
  slug: string | null;
  type: "main" | "dynamic";
  current_version: number | null;
  archived_at: string | null;
}

export function EventsManager() {
  const qc = useQueryClient();
  const [modalOpen, modalCtl] = useDisclosure(false);

  const eventsQ = useQuery({
    queryKey: ["events"],
    queryFn: () => formClient.get<EventRow[]>("/admin/events"),
  });

  const formsQ = useQuery({
    queryKey: ["forms-for-events"],
    queryFn: () => formClient.get<FormSummary[]>("/admin/forms"),
  });

  const form = useForm({
    initialValues: {
      event_key: "",
      form_id: "",
      optional: false,
      description: "",
    },
    validate: {
      event_key: (v) =>
        /^[a-z][a-z0-9_.\-]{2,80}$/.test(v)
          ? null
          : "lowercase letters/digits/._- only, 3–80 chars, starts with a letter",
      form_id: (v) => (v ? null : "Pick a form"),
    },
  });

  const createMut = useMutation({
    mutationFn: (vals: typeof form.values) =>
      formClient.post<EventRow>("/admin/events", { body: vals }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      modalCtl.close();
      form.reset();
      notifications.show({ message: "Event created", color: "green" });
    },
    onError: (err) =>
      notifications.show({
        title: "Failed to create event",
        message: err instanceof Error ? err.message : "Unknown error",
        color: "red",
      }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => formClient.del<void>(`/admin/events/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      notifications.show({ message: "Event deleted", color: "green" });
    },
    onError: (err) =>
      notifications.show({
        title: "Failed to delete event",
        message: err instanceof Error ? err.message : "Unknown error",
        color: "red",
      }),
  });

  const toggleOptionalMut = useMutation({
    mutationFn: (vars: { id: string; optional: boolean }) =>
      formClient.patch<EventRow>(`/admin/events/${vars.id}`, {
        body: { optional: vars.optional },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });

  const forms = formsQ.data ?? [];
  const events = eventsQ.data ?? [];

  const formsById = new Map(forms.map((f) => [f.id, f]));

  function copy(text: string) {
    void navigator.clipboard.writeText(text);
    notifications.show({ message: "Copied", color: "blue", autoClose: 1500 });
  }

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {events.length} event{events.length === 1 ? "" : "s"}
        </Text>
        <Button leftSection={<IconPlus size={14} />} onClick={modalCtl.open}>
          New event
        </Button>
      </Group>

      {eventsQ.isError && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          title="Failed to load events"
        >
          {eventsQ.error instanceof Error
            ? eventsQ.error.message
            : "Unknown error"}
        </Alert>
      )}

      {!eventsQ.isLoading && events.length === 0 && (
        <Center py="xl">
          <Stack align="center" gap="xs">
            <IconCalendarEvent size={48} color="var(--mantine-color-gray-5)" />
            <Text c="dimmed">No events yet.</Text>
            <Text c="dimmed" size="sm">
              Bind an <Code>event_key</Code> to a form so other services can ask
              about completion.
            </Text>
          </Stack>
        </Center>
      )}

      {events.length > 0 && (
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Event key</Table.Th>
              <Table.Th>Bound form</Table.Th>
              <Table.Th>Version</Table.Th>
              <Table.Th>Optional</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {events.map((ev) => {
              const f = formsById.get(ev.form_id);
              return (
                <Table.Tr key={ev.id}>
                  <Table.Td>
                    <Group gap={4}>
                      <Code>{ev.event_key}</Code>
                      <Tooltip label="Copy event_key">
                        <ActionIcon
                          variant="subtle"
                          size="xs"
                          onClick={() => copy(ev.event_key)}
                        >
                          <IconCopy size={12} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    {f ? (
                      <Stack gap={0}>
                        <Text size="sm" fw={500}>
                          {f.title}
                        </Text>
                        {f.slug && (
                          <Text size="xs" c="dimmed">
                            /{f.slug}
                          </Text>
                        )}
                      </Stack>
                    ) : (
                      <Text size="xs" c="dimmed">
                        {ev.form_id.slice(0, 8)}…
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Badge size="sm" variant="light">
                      v{ev.current_version}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Switch
                      size="xs"
                      checked={ev.optional}
                      onChange={(e) =>
                        toggleOptionalMut.mutate({
                          id: ev.id,
                          optional: e.currentTarget.checked,
                        })
                      }
                    />
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed" lineClamp={2} style={{ maxWidth: 300 }}>
                      {ev.description || "—"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Tooltip label="Delete event">
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => {
                          if (
                            confirm(
                              `Delete event ${ev.event_key}? Refused if any submissions have filled it.`,
                            )
                          ) {
                            deleteMut.mutate(ev.id);
                          }
                        }}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}

      <Modal
        opened={modalOpen}
        onClose={modalCtl.close}
        title="New event"
        size="md"
      >
        <form
          onSubmit={form.onSubmit((vals) => createMut.mutate(vals))}
          noValidate
        >
          <Stack gap="sm">
            <TextInput
              label="Event key"
              placeholder="language.profile.v1"
              description="Stable identifier used by other services. Lowercase, dot/dash/underscore allowed."
              required
              {...form.getInputProps("event_key")}
            />
            <Select
              label="Form"
              placeholder="Pick a form"
              required
              data={forms.map((f) => ({
                value: f.id,
                label: f.slug ? `${f.title} (/${f.slug})` : f.title,
              }))}
              searchable
              {...form.getInputProps("form_id")}
            />
            <Switch
              label="Optional"
              description="When optional, callers may display a dismissible prompt instead of forcing the user to fill the form."
              {...form.getInputProps("optional", { type: "checkbox" })}
            />
            <Textarea
              label="Description"
              placeholder="What is this event used for?"
              minRows={2}
              {...form.getInputProps("description")}
            />
            <Group justify="flex-end" gap="sm">
              <Button variant="default" onClick={modalCtl.close}>
                Cancel
              </Button>
              <Button type="submit" loading={createMut.isPending}>
                Create
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
