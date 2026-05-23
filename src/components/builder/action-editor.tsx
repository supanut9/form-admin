"use client"

import {
  Stack,
  Group,
  Text,
  Button,
  ActionIcon,
  Badge,
  Modal,
  Select,
  MultiSelect,
  Box,
  Paper,
  Divider,
  Alert,
  Tooltip,
} from '@mantine/core'
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconAlertCircle,
  IconArrowRight,
} from '@tabler/icons-react'
import { useState, useEffect, useMemo } from 'react'
import { useBuilderStore } from '@/lib/store'
import { addAction, removeAction, updateAction } from '@/lib/logic-store-helpers'
import { RuleBuilder } from './rule-builder'
import type { FormAction, ActionDo, JsonLogicRule } from '@/lib/form-spec.types'

// ── Cycle detection ───────────────────────────────────────────────────────────

/**
 * Builds a directed graph of page-to-page edges from actions, then checks for
 * cycles using DFS. Returns the cycle path if one exists, or null.
 */
function detectCycle(
  pageIds: string[],
  actions: FormAction[],
): string[] | null {
  // Build adjacency list: from page -> to page
  const adj = new Map<string, Set<string>>()
  for (const a of actions) {
    if ('jump_to_page' in a.do) {
      if (!adj.has(a.page_id)) adj.set(a.page_id, new Set())
      adj.get(a.page_id)!.add(a.do.jump_to_page)
    }
  }

  const visited = new Set<string>()
  const stack = new Set<string>()
  const parent = new Map<string, string>()

  function dfs(node: string): string[] | null {
    visited.add(node)
    stack.add(node)
    for (const neighbor of adj.get(node) ?? []) {
      if (!visited.has(neighbor)) {
        parent.set(neighbor, node)
        const cycle = dfs(neighbor)
        if (cycle) return cycle
      } else if (stack.has(neighbor)) {
        // Reconstruct cycle path
        const path: string[] = [neighbor]
        let cur = node
        while (cur !== neighbor) {
          path.unshift(cur)
          const p = parent.get(cur)
          if (!p) break
          cur = p
        }
        path.unshift(neighbor)
        return path
      }
    }
    stack.delete(node)
    return null
  }

  for (const id of pageIds) {
    if (!visited.has(id)) {
      const cycle = dfs(id)
      if (cycle) return cycle
    }
  }
  return null
}

// ── Action modal ──────────────────────────────────────────────────────────────

interface ActionModalProps {
  opened: boolean
  onClose: () => void
  initial?: { action: FormAction; index: number } | null
}

function ActionModal({ opened, onClose, initial }: ActionModalProps) {
  const spec = useBuilderStore((s) => s.formSpec)
  const pages = spec.pages

  const [pageId, setPageId] = useState<string | null>(null)
  const [predicate, setPredicate] = useState<JsonLogicRule | null>(null)
  const [doType, setDoType] = useState<'jump_to_page' | 'skip_pages'>('jump_to_page')
  const [jumpTarget, setJumpTarget] = useState<string | null>(null)
  const [skipTargets, setSkipTargets] = useState<string[]>([])
  const isEdit = !!initial

  const pageOptions = pages.map((p) => ({ value: p.id, label: p.title }))

  useEffect(() => {
    if (opened) {
      if (initial) {
        const a = initial.action
        setPageId(a.page_id)
        setPredicate(a.if)
        if ('jump_to_page' in a.do) {
          setDoType('jump_to_page')
          setJumpTarget(a.do.jump_to_page)
          setSkipTargets([])
        } else {
          setDoType('skip_pages')
          setJumpTarget(null)
          setSkipTargets(a.do.skip_pages)
        }
      } else {
        setPageId(pages[0]?.id ?? null)
        setPredicate(null)
        setDoType('jump_to_page')
        setJumpTarget(null)
        setSkipTargets([])
      }
    }
  }, [opened, initial, pages])

  function buildActionDo(): ActionDo {
    if (doType === 'jump_to_page') {
      return { jump_to_page: jumpTarget ?? '' }
    }
    return { skip_pages: skipTargets }
  }

  function handleSave() {
    if (!pageId) return
    const action: FormAction = {
      trigger: 'page_exit',
      page_id: pageId,
      if: predicate ?? {},
      do: buildActionDo(),
    }
    if (isEdit) {
      updateAction(initial!.index, action)
    } else {
      addAction(action)
    }
    onClose()
  }

  const canSave =
    !!pageId &&
    (doType === 'jump_to_page' ? !!jumpTarget : skipTargets.length > 0)

  // Available target pages — exclude the source page itself
  const targetPageOptions = pages
    .filter((p) => p.id !== pageId)
    .map((p) => ({ value: p.id, label: p.title }))

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? 'Edit page-exit action' : 'Add page-exit action'}
      size="lg"
    >
      <Stack gap="sm">
        <Select
          label="Source page (on exit)"
          placeholder="Select page"
          data={pageOptions}
          value={pageId}
          onChange={setPageId}
        />

        <Box>
          <Text size="sm" fw={500} mb={6}>
            Condition (if)
          </Text>
          <RuleBuilder value={predicate} onChange={setPredicate} />
        </Box>

        <Select
          label="Action type"
          data={[
            { value: 'jump_to_page', label: 'Jump to page' },
            { value: 'skip_pages', label: 'Skip pages' },
          ]}
          value={doType}
          onChange={(v) => setDoType((v as 'jump_to_page' | 'skip_pages') ?? 'jump_to_page')}
        />

        {doType === 'jump_to_page' ? (
          <Select
            label="Target page"
            placeholder="Select target page"
            data={targetPageOptions}
            value={jumpTarget}
            onChange={setJumpTarget}
          />
        ) : (
          <MultiSelect
            label="Pages to skip"
            placeholder="Select pages"
            data={targetPageOptions}
            value={skipTargets}
            onChange={setSkipTargets}
          />
        )}

        <Group justify="flex-end" mt="xs">
          <Button variant="light" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isEdit ? 'Update' : 'Add action'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

// ── Predicate preview ─────────────────────────────────────────────────────────

function predicatePreview(rule: JsonLogicRule): string {
  try {
    const s = JSON.stringify(rule)
    return s.length > 50 ? s.slice(0, 47) + '...' : s
  } catch {
    return '(invalid)'
  }
}

// ── Main editor ───────────────────────────────────────────────────────────────

export function ActionEditor() {
  const spec = useBuilderStore((s) => s.formSpec)
  const actions = spec.actions ?? []
  const pages = spec.pages

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<{ action: FormAction; index: number } | null>(null)

  // Group actions by page_id
  const grouped = useMemo(() => {
    const map = new Map<string, Array<{ action: FormAction; index: number }>>()
    for (const page of pages) {
      map.set(page.id, [])
    }
    actions.forEach((action, index) => {
      if (!map.has(action.page_id)) map.set(action.page_id, [])
      map.get(action.page_id)!.push({ action, index })
    })
    return map
  }, [actions, pages])

  // Cycle detection
  const cycleIds = useMemo(
    () => detectCycle(pages.map((p) => p.id), actions),
    [pages, actions],
  )

  const pageTitle = (id: string) => pages.find((p) => p.id === id)?.title ?? id

  function openAdd() {
    setEditTarget(null)
    setModalOpen(true)
  }

  function openEdit(action: FormAction, index: number) {
    setEditTarget({ action, index })
    setModalOpen(true)
  }

  return (
    <Stack gap="md" p="md">
      <Group justify="space-between">
        <Stack gap={0}>
          <Text fw={600} size="sm">
            Page-exit actions
          </Text>
          <Text size="xs" c="dimmed">
            Redirect respondents to different pages or skip pages based on their answers.
          </Text>
        </Stack>
        <Button
          size="xs"
          leftSection={<IconPlus size={14} />}
          variant="light"
          onClick={openAdd}
        >
          Add action
        </Button>
      </Group>

      {cycleIds && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" title="Cycle detected">
          <Text size="xs">
            Page navigation loop: {cycleIds.map((id) => pageTitle(id)).join(' → ')}. Respondents
            may become trapped. Fix the jump targets to resolve this.
          </Text>
        </Alert>
      )}

      <Divider />

      {actions.length === 0 ? (
        <Box
          p="xl"
          style={{
            border: '2px dashed var(--mantine-color-gray-3)',
            borderRadius: 'var(--mantine-radius-sm)',
            textAlign: 'center',
          }}
        >
          <Text size="sm" c="dimmed">
            No actions yet. Click "Add action" to create one.
          </Text>
        </Box>
      ) : (
        <Stack gap="md">
          {pages.map((page) => {
            const pageActions = grouped.get(page.id) ?? []
            if (pageActions.length === 0) return null
            return (
              <Box key={page.id}>
                <Text size="xs" fw={600} c="dimmed" mb={6} tt="uppercase">
                  On exit from: {page.title}
                </Text>
                <Stack gap="xs">
                  {pageActions.map(({ action, index }) => {
                    const doLabel =
                      'jump_to_page' in action.do
                        ? `Jump to "${pageTitle(action.do.jump_to_page)}"`
                        : `Skip: ${action.do.skip_pages.map(pageTitle).join(', ')}`
                    return (
                      <Paper key={index} withBorder p="xs">
                        <Group justify="space-between" wrap="nowrap">
                          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                            <Text size="xs" c="dimmed" ff="monospace" truncate>
                              if {predicatePreview(action.if)}
                            </Text>
                            <Group gap={4} wrap="nowrap">
                              <IconArrowRight
                                size={12}
                                color="var(--mantine-color-indigo-6)"
                              />
                              <Badge size="xs" variant="light" color="indigo">
                                {doLabel}
                              </Badge>
                            </Group>
                          </Stack>
                          <Group gap={4} wrap="nowrap">
                            <Tooltip label="Edit" withArrow>
                              <ActionIcon
                                size="xs"
                                variant="subtle"
                                onClick={() => openEdit(action, index)}
                                aria-label={`Edit action ${index + 1}`}
                              >
                                <IconEdit size={14} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Delete" withArrow>
                              <ActionIcon
                                size="xs"
                                variant="subtle"
                                color="red"
                                onClick={() => removeAction(index)}
                                aria-label={`Delete action ${index + 1}`}
                              >
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Group>
                      </Paper>
                    )
                  })}
                </Stack>
              </Box>
            )
          })}
        </Stack>
      )}

      <ActionModal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditTarget(null)
        }}
        initial={editTarget}
      />
    </Stack>
  )
}
