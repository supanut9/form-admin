"use client"

import {
  Stack,
  Title,
  Button,
  Table,
  Badge,
  Anchor,
  Group,
  Text,
  Center,
  TextInput,
  Select,
  Modal,
  SimpleGrid,
  Card,
  Divider,
  ScrollArea,
} from '@mantine/core'
import {
  IconFileText,
  IconPlus,
  IconTemplate,
} from '@tabler/icons-react'
import { useDisclosure } from '@mantine/hooks'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { formClient } from '@/lib/form-client'
import { TemplateGallery } from '@/components/templates/template-gallery'

interface FormRow {
  id: string
  title: string
  slug: string
  type: 'main' | 'dynamic'
  current_version: number | null
  archived_at: string | null
}

function useFormsList() {
  return useQuery<FormRow[]>({
    queryKey: ['admin-forms'],
    queryFn: () => formClient.get<FormRow[]>('/admin/forms'),
  })
}

interface CreatePayload {
  title: string
  slug: string
  type: 'main' | 'dynamic'
}

interface DuplicatePayload {
  title: string
  slug: string
}

export default function FormsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: forms, isLoading, isError } = useFormsList()
  // "New form" 2-step modal state
  const [newFormModalOpen, { open: openNewFormModal, close: closeNewFormModal }] = useDisclosure(false)
  // step: 'choose' → pick blank or template | 'blank' → fill in details | 'template' → gallery
  const [newFormStep, setNewFormStep] = useState<'choose' | 'blank' | 'template'>('choose')

  function openNewForm() {
    setNewFormStep('choose')
    openNewFormModal()
  }

  function closeNewForm() {
    closeNewFormModal()
    // Reset to choose after the modal closing animation
    setTimeout(() => setNewFormStep('choose'), 200)
  }

  const [dupModalOpen, { open: openDupModal, close: closeDupModal }] = useDisclosure(false)
  const [duplicateFor, setDuplicateFor] = useState<FormRow | null>(null)

  const form = useForm<CreatePayload>({
    initialValues: { title: '', slug: '', type: 'dynamic' },
    validate: {
      title: (v) => (v.trim().length === 0 ? 'Title is required' : null),
      slug: (v) =>
        /^[a-z0-9-]+$/.test(v.trim()) ? null : 'Slug must be lowercase letters, numbers and hyphens',
    },
  })

  const dupForm = useForm<DuplicatePayload>({
    initialValues: { title: '', slug: '' },
    validate: {
      title: (v) => (v.trim().length === 0 ? 'Title is required' : null),
      slug: (v) =>
        /^[a-z0-9-]+$/.test(v.trim())
          ? null
          : 'Slug must be lowercase letters, numbers and hyphens',
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: DuplicatePayload }) =>
      formClient.post<{ id: string; slug: string }>(`/admin/forms/${id}/duplicate`, { body }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-forms'] })
      closeDupModal()
      setDuplicateFor(null)
      dupForm.reset()
      notifications.show({
        title: 'Duplicated',
        message: 'Opening the new form in the builder…',
        color: 'green',
      })
      router.push(`/forms/${result.id}/builder`)
    },
    onError: (err) =>
      notifications.show({
        title: 'Failed to duplicate form',
        message: err instanceof Error ? err.message : 'Unknown error',
        color: 'red',
      }),
  })

  function handleDuplicate(values: DuplicatePayload) {
    if (!duplicateFor) return
    duplicateMutation.mutate({ id: duplicateFor.id, body: values })
  }

  const createMutation = useMutation({
    mutationFn: (payload: CreatePayload) =>
      formClient.post<{ id: string }>('/admin/forms', { body: payload }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-forms'] })
      close()
      form.reset()
      router.push(`/forms/${result.id}/builder`)
    },
    onError: (err) => {
      notifications.show({
        title: 'Failed to create form',
        message: err instanceof Error ? err.message : 'Unknown error',
        color: 'red',
      })
    },
  })

  function handleCreate(values: CreatePayload) {
    createMutation.mutate(values)
  }

  return (
    <>
      <Stack>
        <Group justify="space-between">
          <Title order={2}>Forms</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={openNewForm}>
            New form
          </Button>
        </Group>

        {isLoading && <Text c="dimmed">Loading…</Text>}
        {isError && <Text c="red">Failed to load forms.</Text>}

        {!isLoading && !isError && forms && forms.length === 0 && (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconFileText size={48} color="var(--mantine-color-gray-5)" />
              <Text c="dimmed">No forms yet. Create one to get started.</Text>
            </Stack>
          </Center>
        )}

        {!isLoading && !isError && forms && forms.length > 0 && (
          <Table highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Title</Table.Th>
                <Table.Th>Slug</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Version</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {forms.map((row) => (
                <Table.Tr key={row.id}>
                  <Table.Td>{row.title}</Table.Td>
                  <Table.Td>
                    <Text size="sm" ff="monospace">
                      {row.slug}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="xs" variant="light">
                      {row.type}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {row.current_version !== null ? `v${row.current_version}` : '—'}
                  </Table.Td>
                  <Table.Td>
                    {row.archived_at ? (
                      <Badge size="xs" color="gray">
                        Archived
                      </Badge>
                    ) : (
                      <Badge size="xs" color="green">
                        Active
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="md">
                      <Anchor component={Link} href={`/forms/${row.id}/builder`} size="sm">
                        Builder
                      </Anchor>
                      <Anchor component={Link} href={`/forms/${row.id}/submissions`} size="sm">
                        Submissions
                      </Anchor>
                      <Anchor component={Link} href={`/forms/${row.id}/versions`} size="sm">
                        Versions
                      </Anchor>
                      <Anchor
                        component="button"
                        size="sm"
                        onClick={() => {
                          setDuplicateFor(row)
                          dupForm.setValues({
                            title: `${row.title} (copy)`,
                            slug: `${row.slug}-copy`,
                          })
                          openDupModal()
                        }}
                      >
                        Duplicate
                      </Anchor>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>

      {/* 2-step New Form modal */}
      <Modal
        opened={newFormModalOpen}
        onClose={closeNewForm}
        title="New form"
        size={newFormStep === 'template' ? 'xl' : 'sm'}
      >
        {newFormStep === 'choose' && (
          <Stack gap="sm">
            <Text size="sm" c="dimmed">
              How would you like to start?
            </Text>
            <SimpleGrid cols={2} spacing="sm">
              <Card
                withBorder
                padding="lg"
                radius="md"
                style={{ cursor: 'pointer', textAlign: 'center' }}
                onClick={() => setNewFormStep('blank')}
              >
                <Stack align="center" gap="xs">
                  <IconFileText size={36} color="var(--mantine-color-indigo-6)" />
                  <Text fw={600}>Start blank</Text>
                  <Text size="xs" c="dimmed">
                    Build your form from scratch.
                  </Text>
                </Stack>
              </Card>
              <Card
                withBorder
                padding="lg"
                radius="md"
                style={{ cursor: 'pointer', textAlign: 'center' }}
                onClick={() => setNewFormStep('template')}
              >
                <Stack align="center" gap="xs">
                  <IconTemplate size={36} color="var(--mantine-color-violet-6)" />
                  <Text fw={600}>From template</Text>
                  <Text size="xs" c="dimmed">
                    Start with a pre-built layout.
                  </Text>
                </Stack>
              </Card>
            </SimpleGrid>
          </Stack>
        )}

        {newFormStep === 'blank' && (
          <>
            <Anchor
              component="button"
              size="xs"
              c="dimmed"
              mb="sm"
              onClick={() => setNewFormStep('choose')}
            >
              &larr; Back
            </Anchor>
            <form onSubmit={form.onSubmit(handleCreate)}>
              <Stack gap="sm">
                <TextInput
                  label="Title"
                  placeholder="Language Profile"
                  required
                  {...form.getInputProps('title')}
                />
                <TextInput
                  label="Slug"
                  placeholder="language-profile"
                  required
                  description="URL-safe identifier. Lowercase, hyphens only."
                  {...form.getInputProps('slug')}
                />
                <Select
                  label="Type"
                  data={[
                    { value: 'dynamic', label: 'Dynamic (Google Forms style)' },
                    { value: 'main', label: 'Main (auth profile — Phase 2)' },
                  ]}
                  {...form.getInputProps('type')}
                />
                <Group justify="flex-end" mt="sm">
                  <Button
                    variant="light"
                    onClick={closeNewForm}
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={createMutation.isPending}>
                    Create
                  </Button>
                </Group>
              </Stack>
            </form>
          </>
        )}

        {newFormStep === 'template' && (
          <>
            <Anchor
              component="button"
              size="xs"
              c="dimmed"
              mb="sm"
              onClick={() => setNewFormStep('choose')}
            >
              &larr; Back
            </Anchor>
            <Divider mb="sm" />
            <ScrollArea h={480} offsetScrollbars>
              <TemplateGallery compact onStartBlank={() => setNewFormStep('blank')} />
            </ScrollArea>
          </>
        )}
      </Modal>

      <Modal
        opened={dupModalOpen}
        onClose={() => {
          closeDupModal()
          setDuplicateFor(null)
        }}
        title={duplicateFor ? `Duplicate "${duplicateFor.title}"` : 'Duplicate form'}
        size="sm"
      >
        <form onSubmit={dupForm.onSubmit(handleDuplicate)}>
          <Stack gap="sm">
            <TextInput label="New title" required {...dupForm.getInputProps('title')} />
            <TextInput
              label="New slug"
              description="Public URL path under /f/"
              required
              {...dupForm.getInputProps('slug')}
            />
            <Group justify="flex-end" gap="sm">
              <Button
                variant="default"
                onClick={() => {
                  closeDupModal()
                  setDuplicateFor(null)
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={duplicateMutation.isPending}>
                Duplicate
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  )
}
