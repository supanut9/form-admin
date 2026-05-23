"use client";

import {
  AppShell,
  Group,
  Menu,
  NavLink,
  Text,
  UnstyledButton,
} from "@mantine/core";
import {
  IconFileText,
  IconCalendarEvent,
  IconSettings,
  IconUser,
  IconLogout,
  IconTemplate,
} from "@tabler/icons-react";
import Link from "next/link";
import type { SessionAccount } from "@/lib/session";

const navLinks = [
  { href: "/forms", label: "Forms", icon: IconFileText },
  { href: "/templates", label: "Templates", icon: IconTemplate },
  { href: "/events", label: "Events", icon: IconCalendarEvent },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

interface UserMenuProps {
  email: string;
  name: string;
}

function UserMenu({ email, name }: UserMenuProps) {
  return (
    <Menu shadow="md" width={220} position="bottom-end">
      <Menu.Target>
        <UnstyledButton>
          <Group gap="xs">
            <IconUser size={20} />
            <Text size="sm">{name || email}</Text>
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{email}</Menu.Label>
        <Menu.Divider />
        {/* prefetch={false} prevents silent pre-fetch triggering logout */}
        <Menu.Item
          component={Link}
          href="/auth/logout"
          prefetch={false}
          leftSection={<IconLogout size={16} />}
          color="red"
        >
          Sign out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

interface AdminShellProps {
  session: SessionAccount;
  children: React.ReactNode;
}

export default function AdminShell({ session, children }: AdminShellProps) {
  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 220, breakpoint: "sm" }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Text fw={700} size="lg">
              Form Admin
            </Text>
          </Group>
          <UserMenu email={session.sub} name={session.sub} />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <NavLink
            key={href}
            component={Link}
            href={href}
            label={label}
            leftSection={<Icon size={18} />}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
