import { Stack, Title, Text } from "@mantine/core";
import { IntegrationRecipes } from "@/components/settings/integration-recipes";

export default function IntegrationPage() {
  return (
    <Stack gap="md">
      <Stack gap={2}>
        <Title order={3}>Integration recipes</Title>
        <Text size="sm" c="dimmed">
          Copy-paste snippets for the four supported integration channels.
          Each example uses the form / event you pick from the dropdown so the
          URLs and keys are already filled in.
        </Text>
      </Stack>
      <IntegrationRecipes />
    </Stack>
  );
}
