"use client";

import { Checkbox, Stack, Text, Skeleton } from "@mantine/core";
import { useEffect, useState } from "react";
import { formClient } from "@/lib/form-client";

interface Permission {
  id: string;
  key: string;
  description: string | null;
}

interface PermissionMultiselectProps {
  value: string[];
  onChange: (keys: string[]) => void;
  /** If true, renders read-only checkboxes (for built-in roles). */
  readOnly?: boolean;
}

export function PermissionMultiselect({
  value,
  onChange,
  readOnly = false,
}: PermissionMultiselectProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    formClient
      .get<Permission[]>("/admin/permissions")
      .then(setPermissions)
      .catch(() => setPermissions([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Stack gap={6}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height={20} radius="sm" />
        ))}
      </Stack>
    );
  }

  const toggle = (key: string, checked: boolean) => {
    if (readOnly) return;
    onChange(checked ? [...value, key] : value.filter((k) => k !== key));
  };

  return (
    <Stack gap={6}>
      {permissions.map((perm) => (
        <Checkbox
          key={perm.id}
          label={
            <span>
              <Text component="span" size="sm" fw={500}>
                {perm.key}
              </Text>
              {perm.description && (
                <Text component="span" size="xs" c="dimmed" ml={6}>
                  {perm.description}
                </Text>
              )}
            </span>
          }
          checked={value.includes(perm.key)}
          onChange={(e) => toggle(perm.key, e.currentTarget.checked)}
          disabled={readOnly}
        />
      ))}
    </Stack>
  );
}
