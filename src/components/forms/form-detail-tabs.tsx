"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Group, Title, Text, Badge, Anchor, Box } from "@mantine/core";
import { IconChevronLeft } from "@tabler/icons-react";

interface Props {
  formId: string;
  title: string | null;
  slug?: string | null;
  archived?: boolean;
}

const TABS = [
  { key: "builder", label: "Builder" },
  { key: "submissions", label: "Submissions" },
  { key: "versions", label: "Versions" },
] as const;

export function FormDetailTabs({ formId, title, slug, archived }: Props) {
  const pathname = usePathname();

  // Active tab is whichever TAB.key matches the trailing segment of the path.
  const activeKey = TABS.find((t) => pathname?.endsWith(`/${t.key}`))?.key ?? "builder";

  return (
    <Box
      px="md"
      py="sm"
      style={{
        borderBottom: "1px solid var(--mantine-color-gray-3)",
        background: "var(--mantine-color-white)",
        flexShrink: 0,
      }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Group gap="md" align="center" wrap="nowrap" style={{ minWidth: 0 }}>
          <Anchor
            component={Link}
            href="/forms"
            size="sm"
            c="dimmed"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <IconChevronLeft size={14} />
            Forms
          </Anchor>
          <div style={{ minWidth: 0 }}>
            <Title order={4} lineClamp={1}>
              {title ?? formId}
            </Title>
            <Group gap={6} mt={2}>
              {slug && (
                <Text size="xs" c="dimmed">
                  /{slug}
                </Text>
              )}
              {archived && (
                <Badge size="xs" color="gray" variant="light">
                  Archived
                </Badge>
              )}
            </Group>
          </div>
        </Group>

        <Group gap={4} style={{ flexShrink: 0 }}>
          {TABS.map((tab) => {
            const isActive = tab.key === activeKey;
            return (
              <Anchor
                key={tab.key}
                component={Link}
                href={`/forms/${formId}/${tab.key}`}
                size="sm"
                underline="never"
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  background: isActive
                    ? "var(--mantine-color-indigo-light)"
                    : "transparent",
                  color: isActive
                    ? "var(--mantine-color-indigo-7)"
                    : "var(--mantine-color-gray-7)",
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                {tab.label}
              </Anchor>
            );
          })}
        </Group>
      </Group>
    </Box>
  );
}
