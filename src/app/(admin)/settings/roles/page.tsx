"use client";

import {
  Title,
  Button,
  Group,
  Stack,
  Text,
  Paper,
  Modal,
  TextInput,
  Select,
  Skeleton,
  Badge,
  Divider,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { formClient } from "@/lib/form-client";
import { PermissionMultiselect } from "@/components/settings/permission-multiselect";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Role {
  id: string;
  name: string;
  description: string | null;
}

interface AccountRoleRow {
  account_id: string;
  role_id: string;
  granted_at: string;
  role: Role;
}

const BUILT_IN_ROLES = new Set(["super_admin", "admin", "viewer"]);

// ── Create role modal ─────────────────────────────────────────────────────────

interface CreateRoleModalProps {
  opened: boolean;
  onClose: () => void;
  onCreated: (role: Role) => void;
}

function CreateRoleModal({ opened, onClose, onCreated }: CreateRoleModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setName("");
    setDescription("");
    setScopes([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      notifications.show({ color: "red", message: "Role name is required." });
      return;
    }
    setLoading(true);
    try {
      const role = await formClient.post<Role>("/admin/roles", {
        body: { name: name.trim(), description: description.trim() || null, permission_ids: scopes },
      });
      onCreated(role);
      reset();
      onClose();
    } catch (err: any) {
      notifications.show({ color: "red", message: err.message ?? "Failed to create role." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="New Role" size="lg">
      <Stack gap="sm">
        <TextInput
          label="Name"
          placeholder="e.g. form_editor"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          required
        />
        <TextInput
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
        />
        <div>
          <Text size="sm" fw={500} mb={6}>
            Permissions
          </Text>
          <PermissionMultiselect value={scopes} onChange={setScopes} />
        </div>
        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Create
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [accountRoles, setAccountRoles] = useState<AccountRoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [grantAccountId, setGrantAccountId] = useState("");
  const [grantRoleId, setGrantRoleId] = useState<string | null>(null);
  const [grantLoading, setGrantLoading] = useState(false);
  const [createOpened, createHandlers] = useDisclosure(false);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null;
  const isBuiltIn = selectedRole ? BUILT_IN_ROLES.has(selectedRole.name) : false;

  const loadRoles = () => {
    setLoading(true);
    formClient
      .get<Role[]>("/admin/roles")
      .then((r) => {
        setRoles(r);
        if (!selectedRoleId && r.length > 0) setSelectedRoleId(r[0].id);
      })
      .catch(() => setRoles([]))
      .finally(() => setLoading(false));
  };

  // For "grant role" section — reuse the full list of account-roles with a naive
  // approach (no specific account filter here; we show recently granted rows from
  // any account query if available). A production build would add server-side search.
  const loadAccountRolesForRole = (roleId: string) => {
    // We don't have a "list all account-roles" endpoint — use a placeholder.
    // The per-account endpoint exists at GET /v1/admin/accounts/:accountId/roles.
    // For now, show rows that were loaded in this session.
    setAccountRoles((prev) => prev.filter((ar) => ar.role_id === roleId));
  };

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    if (selectedRoleId) loadAccountRolesForRole(selectedRoleId);
  }, [selectedRoleId]);

  const handleGrant = async () => {
    if (!grantAccountId.trim() || !grantRoleId) {
      notifications.show({ color: "red", message: "Account UUID and role are required." });
      return;
    }
    setGrantLoading(true);
    try {
      const ar = await formClient.post<AccountRoleRow>("/admin/account-roles", {
        body: { account_id: grantAccountId.trim(), role_id: grantRoleId },
      });
      setAccountRoles((prev) => [ar, ...prev.filter((r) => r.role_id !== ar.role_id || r.account_id !== ar.account_id)]);
      setGrantAccountId("");
      notifications.show({ color: "green", message: "Role granted." });
    } catch (err: any) {
      notifications.show({ color: "red", message: err.message ?? "Failed to grant role." });
    } finally {
      setGrantLoading(false);
    }
  };

  const handleRevokeGrant = (accountId: string, roleId: string) => {
    modals.openConfirmModal({
      title: "Remove role",
      children: <Text size="sm">Remove this role from account {accountId}?</Text>,
      labels: { confirm: "Remove", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await formClient.del(`/admin/account-roles/${accountId}/${roleId}`);
          setAccountRoles((prev) =>
            prev.filter((r) => !(r.account_id === accountId && r.role_id === roleId)),
          );
        } catch (err: any) {
          notifications.show({ color: "red", message: err.message ?? "Failed." });
        }
      },
    });
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>Roles</Title>
        <Button size="sm" leftSection={<IconPlus size={14} />} onClick={createHandlers.open}>
          New role
        </Button>
      </Group>

      <Group align="flex-start" gap="md" style={{ minHeight: 400 }}>
        {/* Left: role list */}
        <Stack gap={4} style={{ width: 200, flexShrink: 0 }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={32} radius="sm" />)
          ) : (
            roles.map((r) => (
              <Paper
                key={r.id}
                p="xs"
                withBorder
                style={{
                  cursor: "pointer",
                  background:
                    r.id === selectedRoleId
                      ? "var(--mantine-color-blue-light)"
                      : undefined,
                }}
                onClick={() => setSelectedRoleId(r.id)}
              >
                <Group justify="space-between" gap="xs">
                  <Text size="sm" fw={r.id === selectedRoleId ? 600 : 400}>
                    {r.name}
                  </Text>
                  {BUILT_IN_ROLES.has(r.name) && (
                    <Badge size="xs" variant="dot">
                      built-in
                    </Badge>
                  )}
                </Group>
              </Paper>
            ))
          )}
        </Stack>

        {/* Right: permissions + account grants */}
        {selectedRole ? (
          <Stack gap="md" style={{ flex: 1 }}>
            <div>
              <Text fw={600} mb={6}>
                Permissions for <em>{selectedRole.name}</em>
                {isBuiltIn && (
                  <Badge ml={8} size="xs" variant="outline">
                    read-only
                  </Badge>
                )}
              </Text>
              <PermissionMultiselect
                value={[]}
                onChange={() => {}}
                readOnly={true}
              />
            </div>

            <Divider />

            <div>
              <Text fw={600} mb={8}>
                Grant role to account
              </Text>
              <Group gap="sm">
                <TextInput
                  placeholder="Account UUID"
                  value={grantAccountId}
                  onChange={(e) => setGrantAccountId(e.currentTarget.value)}
                  style={{ flex: 1 }}
                />
                <Select
                  placeholder="Select role"
                  data={roles.map((r) => ({ value: r.id, label: r.name }))}
                  value={grantRoleId}
                  onChange={setGrantRoleId}
                  style={{ width: 180 }}
                />
                <Button size="sm" onClick={handleGrant} loading={grantLoading}>
                  Grant
                </Button>
              </Group>

              {accountRoles.length > 0 && (
                <Stack gap={4} mt="sm">
                  {accountRoles.map((ar) => (
                    <Group key={`${ar.account_id}-${ar.role_id}`} justify="space-between">
                      <Text size="sm" ff="monospace">
                        {ar.account_id}
                      </Text>
                      <Group gap={4}>
                        <Badge size="sm">{ar.role.name}</Badge>
                        <Tooltip label="Remove">
                          <ActionIcon
                            size="sm"
                            color="red"
                            variant="subtle"
                            onClick={() => handleRevokeGrant(ar.account_id, ar.role_id)}
                          >
                            <IconTrash size={12} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>
                  ))}
                </Stack>
              )}
            </div>
          </Stack>
        ) : (
          <Text c="dimmed">Select a role to view its permissions.</Text>
        )}
      </Group>

      <CreateRoleModal
        opened={createOpened}
        onClose={createHandlers.close}
        onCreated={(role) => setRoles((prev) => [...prev, role])}
      />
    </Stack>
  );
}
