"use client";

import {
  Box,
  Group,
  Tabs,
  Text,
  Badge,
  Stack,
} from "@mantine/core";
import {
  IconUsers,
  IconCreditCard,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WorkspaceProvider } from "./workspace-context";
import type { PlanSlug } from "@/lib/workspaces";
import { PLAN_DISPLAY } from "@/lib/workspaces";

interface WorkspaceShellProps {
  slug: string;
  workspaceName: string;
  plan: PlanSlug;
  children: React.ReactNode;
}

const tabs = [
  {
    value: "members",
    label: "Members",
    icon: IconUsers,
    href: (slug: string) => `/workspaces/${slug}/members`,
  },
  {
    value: "plan",
    label: "Plan & billing",
    icon: IconCreditCard,
    href: (slug: string) => `/workspaces/${slug}/plan`,
  },
];

function activeTab(pathname: string, slug: string): string {
  if (pathname.includes("/billing")) return "plan"; // billing is sub-page of plan tab
  if (pathname.includes("/members")) return "members";
  if (pathname.includes("/plan")) return "plan";
  return "members";
}

export default function WorkspaceShell({
  slug,
  workspaceName,
  plan,
  children,
}: WorkspaceShellProps) {
  const pathname = usePathname();
  const active = activeTab(pathname, slug);
  const planMeta = PLAN_DISPLAY[plan] ?? PLAN_DISPLAY.free;

  return (
    <WorkspaceProvider slug={slug}>
      <Stack gap={0} style={{ height: "100%" }}>
        {/* Workspace header */}
        <Box
          px="md"
          py="sm"
          style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}
        >
          <Group gap="sm" align="center">
            <Text fw={700} size="lg">
              {workspaceName}
            </Text>
            <Badge color={planMeta.color} variant="light" size="sm">
              {planMeta.label}
            </Badge>
          </Group>
        </Box>

        {/* Sub-nav tabs */}
        <Tabs
          value={active}
          style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}
        >
          <Tabs.List px="md">
            {tabs.map(({ value, label, icon: Icon, href }) => (
              <Tabs.Tab
                key={value}
                value={value}
                leftSection={<Icon size={16} />}
                renderRoot={(props) => <Link {...props} href={href(slug)} />}
              >
                {label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>

        {/* Page content */}
        <Box style={{ flex: 1, overflow: "auto", padding: "var(--mantine-spacing-md)" }}>
          {children}
        </Box>
      </Stack>
    </WorkspaceProvider>
  );
}
