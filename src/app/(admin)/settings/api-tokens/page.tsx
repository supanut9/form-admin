"use client";

import {
  Title,
  Button,
  Table,
  Badge,
  Group,
  Text,
  Stack,
  Modal,
  TextInput,
  Select,
  Code,
  Alert,
  ActionIcon,
  Tooltip,
  Skeleton,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconCopy, IconTrash, IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { formClient } from "@/lib/form-client";
import { PermissionMultiselect } from "@/components/settings/permission-multiselect";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TokenRow {
  id: string;
  name: string;
  type: "admin" | "webhook_caller" | "public_read";
  scopes_json: string[];
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

interface CreateTokenResponse {
  token: string;
  row: TokenRow;
}

// ── Create modal ──────────────────────────────────────────────────────────────

interface CreateModalProps {
  opened: boolean;
  onClose: () => void;
  onCreated: (raw: string, row: TokenRow) => void;
}

function CreateTokenModal({ opened, onClose, onCreated }: CreateModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("webhook_caller");
  const [scopes, setScopes] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setName("");
    setType("webhook_caller");
    setScopes([]);
    setExpiresAt(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim() || scopes.length === 0) {
      notifications.show({ color: "red", message: "Name and at least one scope are required." });
      return;
    }
    setLoading(true);
    try {
      const resp = await formClient.post<CreateTokenResponse>("/admin/tokens", {
        body: {
          name: name.trim(),
          type,
          scopes,
          expires_at: expiresAt ?? null,
        },
      });
      onCreated(resp.token, resp.row);
      reset();
      onClose();
    } catch (err: any) {
      notifications.show({ color: "red", message: err.message ?? "Failed to create token." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Create API Token" size="lg">
      <Stack gap="sm">
        <TextInput
          label="Name"
          placeholder="e.g. language-api webhook"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          required
        />
        <Select
          label="Type"
          data={[
            { value: "admin", label: "admin" },
            { value: "webhook_caller", label: "webhook_caller" },
            { value: "public_read", label: "public_read" },
          ]}
          value={type}
          onChange={(v) => setType(v ?? "webhook_caller")}
          required
        />
        <div>
          <Text size="sm" fw={500} mb={6}>
            Scopes
          </Text>
          <PermissionMultiselect value={scopes} onChange={setScopes} />
        </div>
        <DateInput
          label="Expires at (optional)"
          placeholder="No expiry"
          value={expiresAt}
          onChange={setExpiresAt}
          clearable
          minDate={new Date()}
        />
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

// ── One-time reveal modal ─────────────────────────────────────────────────────

interface RevealModalProps {
  opened: boolean;
  rawToken: string | null;
  onClose: () => void;
}

function TokenRevealModal({ opened, rawToken, onClose }: RevealModalProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!rawToken) return;
    await navigator.clipboard.writeText(rawToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Your new API Token" size="lg" closeOnClickOutside={false}>
      <Stack gap="sm">
        <Alert color="orange" title="You will not see this again">
          Copy this token now. Once you close this dialog, the raw token is gone — only a hash is
          stored.
        </Alert>
        <Code block>{rawToken ?? ""}</Code>
        <Group justify="flex-end">
          <Button
            leftSection={<IconCopy size={16} />}
            variant="light"
            onClick={copy}
          >
            {copied ? "Copied!" : "Copy"}
          </Button>
          <Button onClick={onClose}>Done</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ApiTokensPage() {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpened, createHandlers] = useDisclosure(false);
  const [revealToken, setRevealToken] = useState<string | null>(null);
  const revealOpened = revealToken !== null;

  const load = () => {
    setLoading(true);
    formClient
      .get<TokenRow[]>("/admin/tokens")
      .then(setTokens)
      .catch(() => setTokens([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreated = (raw: string, row: TokenRow) => {
    setTokens((prev) => [row, ...prev]);
    setRevealToken(raw);
  };

  const handleRevoke = (id: string, name: string) => {
    modals.openConfirmModal({
      title: "Revoke token",
      children: (
        <Text size="sm">
          Revoke <strong>{name}</strong>? It will stop working immediately.
        </Text>
      ),
      labels: { confirm: "Revoke", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          const updated = await formClient.post<TokenRow>(`/admin/tokens/${id}/revoke`);
          setTokens((prev) => prev.map((t) => (t.id === id ? updated : t)));
        } catch (err: any) {
          notifications.show({ color: "red", message: err.message ?? "Failed to revoke token." });
        }
      },
    });
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>API Tokens</Title>
        <Button size="sm" onClick={createHandlers.open}>
          Create token
        </Button>
      </Group>

      {loading ? (
        <Stack gap={8}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={40} radius="sm" />
          ))}
        </Stack>
      ) : tokens.length === 0 ? (
        <Text c="dimmed">No tokens yet.</Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Scopes</Table.Th>
              <Table.Th>Expires</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {tokens.map((t) => (
              <Table.Tr key={t.id}>
                <Table.Td>{t.name}</Table.Td>
                <Table.Td>
                  <Badge variant="outline" size="sm">
                    {t.type}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" c="dimmed">
                    {t.scopes_json.join(", ") || "—"}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">
                    {t.expires_at ? new Date(t.expires_at).toLocaleDateString() : "Never"}
                  </Text>
                </Table.Td>
                <Table.Td>
                  {t.revoked_at ? (
                    <Badge color="red" size="sm">
                      Revoked
                    </Badge>
                  ) : (
                    <Badge color="green" size="sm">
                      Active
                    </Badge>
                  )}
                </Table.Td>
                <Table.Td>
                  {!t.revoked_at && (
                    <Tooltip label="Revoke">
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        size="sm"
                        onClick={() => handleRevoke(t.id, t.name)}
                      >
                        <IconX size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <CreateTokenModal
        opened={createOpened}
        onClose={createHandlers.close}
        onCreated={handleCreated}
      />
      <TokenRevealModal
        opened={revealOpened}
        rawToken={revealToken}
        onClose={() => setRevealToken(null)}
      />
    </Stack>
  );
}
