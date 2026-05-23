import { Stack, Title, Text } from "@mantine/core";
import { EventsManager } from "@/components/events/events-manager";

export default function EventsPage() {
  return (
    <Stack gap="md" p="md">
      <Stack gap={4}>
        <Title order={2}>Events</Title>
        <Text c="dimmed" size="sm">
          Named integration points. Other services ask{" "}
          <strong>&ldquo;has this user filled event X?&rdquo;</strong> — each
          event binds one <code>event_key</code> to a single form.
        </Text>
      </Stack>
      <EventsManager />
    </Stack>
  );
}
