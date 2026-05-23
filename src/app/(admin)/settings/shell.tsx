"use client";

import { Stack, NavLink, Text, Divider, Box } from "@mantine/core";
import {
  IconKey,
  IconShield,
  IconWebhook,
  IconHistory,
  IconBookmark,
} from "@tabler/icons-react";
import Link from "next/link";
import type { SessionAccount } from "@/lib/session";

const settingsNav = [
  { href: "/settings/api-tokens", label: "API Tokens", icon: IconKey },
  { href: "/settings/roles", label: "Roles", icon: IconShield },
  { href: "/settings/webhooks", label: "Webhooks", icon: IconWebhook },
  { href: "/settings/audit", label: "Audit Log", icon: IconHistory },
  { href: "/settings/integration", label: "Integration recipes", icon: IconBookmark },
];

interface SettingsShellProps {
  session: SessionAccount;
  children: React.ReactNode;
}

export default function SettingsShell({ session, children }: SettingsShellProps) {
  return (
    <Box style={{ display: "flex", gap: "var(--mantine-spacing-md)", height: "100%" }}>
      {/* Left sub-nav */}
      <Stack
        gap={4}
        style={{
          width: 200,
          flexShrink: 0,
          borderRight: "1px solid var(--mantine-color-default-border)",
          paddingRight: "var(--mantine-spacing-md)",
        }}
      >
        <Text fw={600} size="sm" c="dimmed" mb={4}>
          Settings
        </Text>
        {settingsNav.map(({ href, label, icon: Icon }) => (
          <NavLink
            key={href}
            component={Link}
            href={href}
            label={label}
            leftSection={<Icon size={16} />}
          />
        ))}
        <Divider mt="auto" />
        <Text size="xs" c="dimmed" truncate>
          {session.sub}
        </Text>
      </Stack>

      {/* Page content */}
      <Box style={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Box>
  );
}
