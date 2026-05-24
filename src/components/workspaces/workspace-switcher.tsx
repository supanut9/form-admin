"use client";

import {
  Badge,
  Group,
  Menu,
  Skeleton,
  Text,
  UnstyledButton,
} from "@mantine/core";
import {
  IconBuildingCommunity,
  IconCheck,
  IconChevronDown,
  IconSettings,
} from "@tabler/icons-react";
import Link from "next/link";
import type { Workspace } from "@/lib/workspace-context";
import { useWorkspaceContext } from "@/lib/workspace-context";

// ---------------------------------------------------------------------------
// Plan badge
// ---------------------------------------------------------------------------

const PLAN_COLORS: Record<string, string> = {
  free: "gray",
  starter: "teal",
  pro: "indigo",
  business: "violet",
};

function PlanBadge({ plan }: { plan: Workspace["plan"] }) {
  return (
    <Badge
      size="xs"
      color={PLAN_COLORS[plan.slug] ?? "gray"}
      variant="light"
    >
      {plan.name}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// WorkspaceSwitcher
// ---------------------------------------------------------------------------

export function WorkspaceSwitcher() {
  const { currentSlug, allWorkspaces, isLoading, switchTo } =
    useWorkspaceContext();

  if (isLoading) {
    return <Skeleton height={28} width={160} radius="sm" />;
  }

  if (allWorkspaces.length === 0) {
    return (
      <UnstyledButton
        component={Link}
        href="/workspaces/new"
        style={{ fontSize: 14, fontWeight: 500 }}
      >
        Create workspace
      </UnstyledButton>
    );
  }

  const current = allWorkspaces.find((w) => w.slug === currentSlug);
  const displayName = current?.name ?? currentSlug ?? "Select workspace";

  return (
    <Menu shadow="md" width={240} position="bottom-start">
      <Menu.Target>
        <UnstyledButton>
          <Group gap={6}>
            <IconBuildingCommunity size={18} />
            <Text size="sm" fw={500}>
              {displayName}
            </Text>
            {current && <PlanBadge plan={current.plan} />}
            <IconChevronDown size={14} />
          </Group>
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Workspaces</Menu.Label>
        {allWorkspaces.map((ws) => (
          <Menu.Item
            key={ws.id}
            onClick={() => switchTo(ws.slug)}
            leftSection={
              ws.slug === currentSlug ? (
                <IconCheck size={16} />
              ) : (
                <span style={{ display: "inline-block", width: 16 }} />
              )
            }
            rightSection={<PlanBadge plan={ws.plan} />}
          >
            {ws.name}
          </Menu.Item>
        ))}

        <Menu.Divider />

        <Menu.Item
          component={Link}
          href={`/workspaces/${currentSlug ?? "_"}/plan`}
          leftSection={<IconSettings size={16} />}
        >
          Workspace settings
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
