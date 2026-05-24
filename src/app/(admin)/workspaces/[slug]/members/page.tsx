"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Stack,
  Title,
  Text,
  Group,
  Button,
  Table,
  Avatar,
  Badge,
  Select,
  ActionIcon,
  Modal,
  TextInput,
  Alert,
  Skeleton,
  Paper,
  Divider,
  Tooltip,
  Center,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconUserPlus,
  IconTrash,
  IconUsers,
  IconAlertCircle,
  IconCopy,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import {
  listMembers,
  listInvitations,
  addMember,
  removeMember,
  changeMemberRole,
  createInvitation,
  revokeInvitation,
  type WorkspaceRole,
  type WorkspaceMember,
  type WorkspaceInvitation,
} from "@/lib/workspaces";

// ── Helpers ───────────────────────────────────────────────────────────────────

function initialsFromEmail(email: string): string {
  const parts = email.split("@")[0].split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

const ROLE_OPTIONS: { value: WorkspaceRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

const ROLE_COLORS: Record<WorkspaceRole, string> = {
  owner: "orange",
  admin: "violet",
  editor: "blue",
  viewer: "gray",
};

function canEditRole(currentUserRole: WorkspaceRole, targetRole: WorkspaceRole): boolean {
  if (currentUserRole === "owner") return true;
  if (currentUserRole === "admin" && (targetRole === "editor" || targetRole === "viewer"))
    return true;
  return false;
}

function canRemoveMember(currentUserRole: WorkspaceRole): boolean {
  return currentUserRole === "owner";
}

// ── Invite modal ──────────────────────────────────────────────────────────────

function InviteModal({
  slug,
  opened,
  onClose,
}: {
  slug: string;
  opened: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const form = useForm({
    initialValues: { email: "", role: "editor" as WorkspaceRole },
    validate: {
      email: (v) => (/\S+@\S+\.\S+/.test(v) ? null : "Valid email required"),
    },
  });

  const mutation = useMutation({
    mutationFn: (values: { email: string; role: WorkspaceRole }) =>
      createInvitation(slug, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations", slug] });
      notifications.show({
        title: "Invitation sent",
        message: `An invitation has been sent to ${form.values.email}.`,
        color: "green",
      });
      form.reset();
      onClose();
    },
    onError: () => {
      notifications.show({
        title: "Failed to send invitation",
        message: "Please check the email address and try again.",
        color: "red",
      });
    },
  });

  return (
    <Modal opened={opened} onClose={onClose} title="Invite member" centered>
      <form onSubmit={form.onSubmit((v) => mutation.mutate(v))}>
        <Stack gap="sm">
          <TextInput
            label="Email address"
            placeholder="colleague@example.com"
            required
            {...form.getInputProps("email")}
          />
          <Select
            label="Role"
            data={ROLE_OPTIONS.filter((r) => r.value !== "owner")}
            {...form.getInputProps("role")}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={mutation.isPending}
              leftSection={<IconUserPlus size={16} />}
            >
              Send invitation
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function MembersPage({ params }: PageProps) {
  const { slug } = use(params);
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Queries
  const {
    data: members,
    isLoading: membersLoading,
    error: membersError,
  } = useQuery({
    queryKey: ["members", slug],
    queryFn: () => listMembers(slug),
    staleTime: 30_000,
  });

  const {
    data: invitations,
    isLoading: invitationsLoading,
    error: invitationsError,
  } = useQuery({
    queryKey: ["invitations", slug],
    queryFn: () => listInvitations(slug),
    staleTime: 30_000,
  });

  // Mutations
  const removeM = useMutation({
    mutationFn: (accountId: string) => removeMember(slug, accountId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", slug] }),
    onError: () =>
      notifications.show({ title: "Remove failed", message: "Could not remove member.", color: "red" }),
  });

  const changeRoleM = useMutation({
    mutationFn: ({ accountId, role }: { accountId: string; role: WorkspaceRole }) =>
      changeMemberRole(slug, accountId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", slug] }),
    onError: () =>
      notifications.show({ title: "Role change failed", message: "Could not update role.", color: "red" }),
  });

  const revokeM = useMutation({
    mutationFn: (id: string) => revokeInvitation(slug, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations", slug] }),
    onError: () =>
      notifications.show({ title: "Revoke failed", message: "Could not revoke invitation.", color: "red" }),
  });

  // Determine if current account is owner (fallback: assume owner for UI rendering
  // when we don't have a "me" endpoint for workspace role — L21 can refine this)
  const ownerCount = members?.filter((m) => m.role === "owner").length ?? 0;
  // Treat the current session as owner for now (L21 will propagate actual role)
  const myRole: WorkspaceRole = "owner";

  function handleCopyInviteLink(inv: WorkspaceInvitation) {
    const link =
      inv.inviteUrl ??
      `${window.location.origin}/join/${inv.token ?? inv.id}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  return (
    <>
      <InviteModal slug={slug} opened={inviteOpen} onClose={() => setInviteOpen(false)} />

      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <Stack gap={2}>
            <Title order={2}>Members</Title>
            <Text c="dimmed" size="sm">
              Manage who has access to this workspace.
            </Text>
          </Stack>
          <Button
            leftSection={<IconUserPlus size={16} />}
            onClick={() => setInviteOpen(true)}
          >
            Invite member
          </Button>
        </Group>

        {/* Error state */}
        {membersError && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Could not load members">
            Check your connection and reload. The workspace members API may not be available yet.
          </Alert>
        )}

        {/* Members table */}
        {membersLoading ? (
          <Stack gap="xs">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={52} radius="sm" />
            ))}
          </Stack>
        ) : !members || members.length === 0 ? (
          <Paper withBorder p="xl" radius="md">
            <Center>
              <Stack align="center" gap="xs">
                <IconUsers size={40} color="var(--mantine-color-gray-5)" stroke={1.2} />
                <Text c="dimmed" size="sm">
                  No members yet.
                </Text>
              </Stack>
            </Center>
          </Paper>
        ) : (
          <Table highlightOnHover withTableBorder withColumnBorders={false}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Member</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Joined</Table.Th>
                <Table.Th style={{ width: 60 }} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {members.map((member: WorkspaceMember) => {
                const isLastOwner = member.role === "owner" && ownerCount <= 1;
                const editable = canEditRole(myRole, member.role);
                const removable = canRemoveMember(myRole) && !isLastOwner;

                return (
                  <Table.Tr key={member.accountId}>
                    <Table.Td>
                      <Group gap="sm">
                        <Avatar radius="xl" size="sm" color="blue">
                          {initialsFromEmail(member.email)}
                        </Avatar>
                        <Stack gap={0}>
                          <Text size="sm" fw={500}>
                            {member.email}
                          </Text>
                          <Text size="xs" c="dimmed" ff="monospace">
                            {member.accountId}
                          </Text>
                        </Stack>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      {editable ? (
                        <Select
                          size="xs"
                          value={member.role}
                          data={ROLE_OPTIONS}
                          w={120}
                          onChange={(val) => {
                            if (val) {
                              changeRoleM.mutate({
                                accountId: member.accountId,
                                role: val as WorkspaceRole,
                              });
                            }
                          }}
                        />
                      ) : (
                        <Badge color={ROLE_COLORS[member.role]} variant="light" size="sm">
                          {member.role}
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {removable ? (
                        <Tooltip
                          label={isLastOwner ? "Cannot remove last owner" : "Remove member"}
                          withArrow
                        >
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            disabled={isLastOwner || removeM.isPending}
                            onClick={() => removeM.mutate(member.accountId)}
                            aria-label="Remove member"
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      ) : null}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}

        {/* Pending invitations */}
        <Divider label="Pending invitations" labelPosition="left" mt="sm" />

        {invitationsError && (
          <Alert icon={<IconAlertCircle size={16} />} color="orange" title="Could not load invitations">
            The invitations API may not be available yet.
          </Alert>
        )}

        {invitationsLoading ? (
          <Stack gap="xs">
            {[1, 2].map((i) => (
              <Skeleton key={i} height={44} radius="sm" />
            ))}
          </Stack>
        ) : !invitations || invitations.length === 0 ? (
          <Text size="sm" c="dimmed">
            No pending invitations.
          </Text>
        ) : (
          <Table highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Email</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Expires</Table.Th>
                <Table.Th style={{ width: 120 }} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {invitations.map((inv: WorkspaceInvitation) => (
                <Table.Tr key={inv.id}>
                  <Table.Td>
                    <Text size="sm">{inv.email}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={ROLE_COLORS[inv.role]} variant="light" size="sm">
                      {inv.role}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" justify="flex-end">
                      <Tooltip
                        label={copiedId === inv.id ? "Copied!" : "Copy invite link"}
                        withArrow
                      >
                        <ActionIcon
                          variant="subtle"
                          color={copiedId === inv.id ? "green" : "gray"}
                          onClick={() => handleCopyInviteLink(inv)}
                          aria-label="Copy invite link"
                        >
                          {copiedId === inv.id ? (
                            <IconCheck size={16} />
                          ) : (
                            <IconCopy size={16} />
                          )}
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Revoke invitation" withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          disabled={revokeM.isPending}
                          onClick={() => revokeM.mutate(inv.id)}
                          aria-label="Revoke invitation"
                        >
                          <IconX size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </>
  );
}
