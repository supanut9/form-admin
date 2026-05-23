/**
 * Dashboard — the landing page for authenticated admin users.
 *
 * Shows tile shortcuts to the main admin sections.
 * Full stats / recent-activity panels land in Wave 2+.
 */
import { Center, Grid, Card, Text, Title, Stack, ThemeIcon } from "@mantine/core";
import {
  IconFileText,
  IconCalendarEvent,
  IconInbox,
  IconSettings,
} from "@tabler/icons-react";
import Link from "next/link";

interface TileProps {
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  description: string;
  color: string;
}

function DashboardTile({ href, icon: Icon, label, description, color }: TileProps) {
  return (
    <Card
      component={Link}
      href={href}
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{ textDecoration: "none" }}
    >
      <Stack gap="sm" align="flex-start">
        <ThemeIcon color={color} size={48} radius="md" variant="light">
          <Icon size={28} />
        </ThemeIcon>
        <div>
          <Text fw={600} size="md">
            {label}
          </Text>
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        </div>
      </Stack>
    </Card>
  );
}

const tiles: TileProps[] = [
  {
    href: "/forms",
    icon: IconFileText,
    label: "Forms",
    description: "Build and manage dynamic forms",
    color: "indigo",
  },
  {
    href: "/events",
    icon: IconCalendarEvent,
    label: "Events",
    description: "Named event registry — coming in Wave 4",
    color: "teal",
  },
  {
    href: "/submissions",
    icon: IconInbox,
    label: "Submissions",
    description: "View all form submissions — coming in Wave 4",
    color: "grape",
  },
  {
    href: "/settings",
    icon: IconSettings,
    label: "Settings",
    description: "API tokens, roles, webhooks — coming in Wave 5",
    color: "orange",
  },
];

export default function DashboardPage() {
  return (
    <Stack gap="md">
      <Title order={2}>Dashboard</Title>
      <Text c="dimmed" size="sm">
        Welcome to Form Admin. Select a section to get started.
      </Text>
      <Grid>
        {tiles.map((tile) => (
          <Grid.Col key={tile.href} span={{ base: 12, sm: 6, md: 3 }}>
            <DashboardTile {...tile} />
          </Grid.Col>
        ))}
      </Grid>
    </Stack>
  );
}
