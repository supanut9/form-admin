"use client";

/**
 * /workspaces/select — shown when an admin fetch returns
 * 400 { code: "workspace_required", workspaces: [...] }.
 *
 * Displays the user's workspaces, persists the selection to the
 * `current_workspace_slug` cookie, updates the module-level header variable
 * in formClient, and navigates to `returnTo` (defaults to /forms).
 */

import { Suspense } from "react";
import {
  Button,
  Card,
  Container,
  Group,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconBuildingCommunity } from "@tabler/icons-react";
import { useRouter, useSearchParams } from "next/navigation";
import { setWorkspaceSlug } from "@/lib/form-client";
import { useWorkspaceContext } from "@/lib/workspace-context";

const COOKIE_KEY = "current_workspace_slug";

function persistSelection(slug: string): void {
  const maxAge = 60 * 60 * 24 * 30;
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(slug)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  setWorkspaceSlug(slug);
}

function WorkspaceSelectInner() {
  const { allWorkspaces, isLoading } = useWorkspaceContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/forms";

  function handleSelect(slug: string) {
    persistSelection(slug);
    router.replace(returnTo);
  }

  if (isLoading) {
    return (
      <Stack gap="md">
        <Skeleton height={64} radius="md" />
        <Skeleton height={64} radius="md" />
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Title order={3}>Select a workspace to continue</Title>
      <Text c="dimmed" size="sm">
        Your request requires a workspace. Choose one below.
      </Text>

      {allWorkspaces.map((ws) => (
        <Card key={ws.id} withBorder padding="md" radius="md">
          <Group justify="space-between" align="center">
            <Group gap="sm">
              <IconBuildingCommunity size={24} />
              <div>
                <Text fw={500}>{ws.name}</Text>
                <Text size="xs" c="dimmed">
                  {ws.slug}
                </Text>
              </div>
            </Group>
            <Button size="sm" onClick={() => handleSelect(ws.slug)}>
              Select
            </Button>
          </Group>
        </Card>
      ))}

      {allWorkspaces.length === 0 && (
        <Text c="dimmed">You don&apos;t belong to any workspace yet.</Text>
      )}
    </Stack>
  );
}

export default function WorkspaceSelectPage() {
  return (
    <Container size="sm" mt="xl">
      <Suspense
        fallback={
          <Stack gap="md">
            <Skeleton height={64} radius="md" />
            <Skeleton height={64} radius="md" />
          </Stack>
        }
      >
        <WorkspaceSelectInner />
      </Suspense>
    </Container>
  );
}
