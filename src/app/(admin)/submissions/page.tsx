/**
 * Submissions list page — placeholder.
 * Full implementation lands in Wave 4 (Lane 10: submission service + file uploads).
 */
import { Center, Stack, Title, Text, Box } from "@mantine/core";
import { IconInbox } from "@tabler/icons-react";

export default function SubmissionsPage() {
  return (
    <Stack gap="md">
      <Title order={2}>Submissions</Title>
      <Center py="xl">
        <Box ta="center">
          <IconInbox size={48} color="var(--mantine-color-gray-5)" />
          <Text c="dimmed" mt="sm">
            Submissions — coming in Wave 4.
          </Text>
          <Text c="dimmed" size="sm" mt={4}>
            Cross-form submission view with filtering by form, date, and status.
            Per-form submissions are accessible from the form builder.
          </Text>
        </Box>
      </Center>
    </Stack>
  );
}
