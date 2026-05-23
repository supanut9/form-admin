"use client"

import { Box, Group, TextInput, Button, ActionIcon, Text, SegmentedControl, Tooltip } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconArrowBackUp, IconArrowForwardUp } from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useBuilderStore, type MappedPublishError } from '@/lib/store'
import { formClient, type ApiError } from '@/lib/form-client'
import { Palette } from './palette'
import { Canvas, CANVAS_DROP_ID } from './canvas'
import { Inspector } from './inspector'
import { PreviewPane } from './preview-pane'
import { PageTabs } from './page-tabs'
import type { FormSpec, FormFieldType } from '@/lib/form-spec.types'

interface BuilderShellProps {
  formId: string
  initialSpec: FormSpec
}

export function BuilderShell({ formId, initialSpec }: BuilderShellProps) {
  const { formSpec, dirty, undo, redo, historyIndex, history, loadSpec, addField, reorderFields } =
    useBuilderStore()
  const [activePageId, setActivePageId] = useState<string | null>(
    initialSpec.pages[0]?.id ?? null,
  )
  const [rightPanel, setRightPanel] = useState<'inspector' | 'preview'>('inspector')
  const [saving, setSaving] = useState(false)
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null)
  const [draggingPaletteLabel, setDraggingPaletteLabel] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id)
    if (id.startsWith('palette:')) {
      const label =
        (event.active.data.current?.['label'] as string | undefined) ?? 'New field'
      setDraggingPaletteLabel(label)
    } else {
      setDraggingFieldId(id)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingFieldId(null)
    setDraggingPaletteLabel(null)

    const { active, over } = event
    if (!over || !activePageId) return

    const activeId = String(active.id)
    const overId = String(over.id)

    const page = formSpec.pages.find((p) => p.id === activePageId)
    if (!page) return

    // Palette → canvas drop
    if (activeId.startsWith('palette:')) {
      const fieldType = active.data.current?.['fieldType'] as FormFieldType | undefined
      if (!fieldType) return
      const dropIndex = page.fields.findIndex((f) => f.id === overId)
      addField(page.id, fieldType, dropIndex >= 0 ? dropIndex : undefined)
      return
    }

    // Sortable reorder
    if (activeId !== overId && !overId.startsWith(CANVAS_DROP_ID)) {
      const ids = page.fields.map((f) => f.id)
      const oldIdx = ids.indexOf(activeId)
      const newIdx = ids.indexOf(overId)
      if (oldIdx >= 0 && newIdx >= 0) {
        reorderFields(page.id, arrayMove(ids, oldIdx, newIdx))
      }
    }
  }

  const activePage = formSpec.pages.find((p) => p.id === activePageId)
  const draggingField =
    draggingFieldId && activePage
      ? activePage.fields.find((f) => f.id === draggingFieldId)
      : null

  // Load initial spec on mount
  useEffect(() => {
    loadSpec(initialSpec)
    setActivePageId(initialSpec.pages[0]?.id ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSpec.id])

  // Keep activePageId valid when pages change
  useEffect(() => {
    const ids = formSpec.pages.map((p) => p.id)
    if (!activePageId || !ids.includes(activePageId)) {
      setActivePageId(ids[0] ?? null)
    }
  }, [formSpec.pages, activePageId])

  async function handleSave() {
    setSaving(true)
    try {
      // Server requires `version` omitted (or positive int); it assigns the
      // next version itself. It also rejects `show_if: null` — only undefined
      // or a real json-logic object are allowed. Sanitize before sending.
      const { version: _v, ...rest } = formSpec
      void _v
      const specToSave = {
        ...rest,
        pages: rest.pages.map((p) => {
          const { show_if, fields, ...page } = p
          return {
            ...page,
            ...(show_if ? { show_if } : {}),
            fields: fields.map((f) => {
              const { show_if: fShow, ...field } = f
              return { ...field, ...(fShow ? { show_if: fShow } : {}) }
            }),
          }
        }),
      }
      await formClient.post(`/admin/forms/${formId}/versions`, {
        body: { spec_json: specToSave },
      })
      useBuilderStore.setState({ dirty: false, publishErrors: [] })
      notifications.show({
        title: 'Saved',
        message: 'A new version has been published.',
        color: 'green',
      })
    } catch (err) {
      // form-api returns 422 with `{ error: { code: 'publish_guard_failed', details: PublishGuardError[] } }`
      // when the spec is structurally valid but semantically rejected. Map
      // those onto pageId / fieldId so individual cards can highlight.
      const apiErr = err as ApiError | undefined
      const guardDetails = extractGuardDetails(apiErr)
      if (guardDetails) {
        const mapped = mapPublishErrors(guardDetails, formSpec)
        useBuilderStore.setState({ publishErrors: mapped })
        notifications.show({
          title: 'Spec rejected',
          message: `${mapped.length} issue${mapped.length === 1 ? '' : 's'} blocking publish. See the banner above the canvas.`,
          color: 'red',
        })
      } else {
        notifications.show({
          title: 'Save failed',
          message: err instanceof Error ? err.message : 'Unknown error',
          color: 'red',
        })
      }
    } finally {
      setSaving(false)
    }
  }

  function updateTitle(title: string) {
    useBuilderStore.setState((state) => {
      const { history: hist, historyIndex: idx, formSpec: spec } = state
      const nextSpec = { ...spec, title }
      const past = hist.slice(0, idx + 1)
      const newHistory = [...past, nextSpec].slice(-50)
      return { formSpec: nextSpec, history: newHistory, historyIndex: newHistory.length - 1, dirty: true }
    })
  }

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <Group
        p="xs"
        gap="xs"
        justify="space-between"
        style={{
          borderBottom: '1px solid var(--mantine-color-gray-3)',
          background: 'var(--mantine-color-white)',
          flexShrink: 0,
        }}
      >
        <Group gap="xs">
          <TextInput
            value={formSpec.title}
            onChange={(e) => updateTitle(e.currentTarget.value)}
            placeholder="Form title"
            size="sm"
            style={{ width: 240 }}
            aria-label="Form title"
          />
          {dirty && (
            <Text size="xs" c="dimmed">
              Unsaved changes
            </Text>
          )}
        </Group>

        <Group gap="xs">
          <Tooltip label="Undo">
            <ActionIcon
              variant="subtle"
              disabled={!canUndo}
              onClick={undo}
              aria-label="Undo"
            >
              <IconArrowBackUp size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Redo">
            <ActionIcon
              variant="subtle"
              disabled={!canRedo}
              onClick={redo}
              aria-label="Redo"
            >
              <IconArrowForwardUp size={18} />
            </ActionIcon>
          </Tooltip>

          <SegmentedControl
            size="xs"
            value={rightPanel}
            onChange={(v) => setRightPanel(v as 'inspector' | 'preview')}
            data={[
              { label: 'Inspector', value: 'inspector' },
              { label: 'Preview', value: 'preview' },
            ]}
          />

          <Button size="sm" loading={saving} onClick={handleSave} disabled={!dirty}>
            Save
          </Button>
        </Group>
      </Group>

      {/* ── Three-column layout ────────────────────────────────────────── */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <Box style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left: palette */}
          <Box
            style={{
              width: 240,
              flexShrink: 0,
              borderRight: '1px solid var(--mantine-color-gray-3)',
              overflowY: 'auto',
            }}
          >
            <Palette />
          </Box>

          {/* Center: canvas + page tabs */}
          <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box
              p="xs"
              style={{ borderBottom: '1px solid var(--mantine-color-gray-3)', flexShrink: 0 }}
            >
              <PageTabs activePageId={activePageId} onChangeActive={setActivePageId} />
            </Box>
            <Box p="md" style={{ flex: 1, overflowY: 'auto' }}>
              <PublishErrorsBanner
                onJumpToField={(pageId, fieldId) => {
                  setActivePageId(pageId)
                  useBuilderStore.getState().setSelectedField(fieldId)
                  setRightPanel('inspector')
                }}
                onJumpToPage={(pageId) => {
                  setActivePageId(pageId)
                  useBuilderStore.getState().setSelectedField(null)
                }}
              />
              <Canvas activePageId={activePageId} />
            </Box>
          </Box>

          {/* Right: inspector or preview */}
          <Box
            style={{
              width: 320,
              flexShrink: 0,
              borderLeft: '1px solid var(--mantine-color-gray-3)',
              overflowY: 'auto',
            }}
          >
            {rightPanel === 'inspector' ? <Inspector /> : <PreviewPane />}
          </Box>
        </Box>

        <DragOverlay>
          {draggingPaletteLabel ? (
            <Box
              p="xs"
              style={{
                background: 'var(--mantine-color-white)',
                border: '1px solid var(--mantine-color-blue-5)',
                borderRadius: 'var(--mantine-radius-sm)',
                boxShadow: 'var(--mantine-shadow-md)',
                fontSize: 12,
              }}
            >
              {draggingPaletteLabel}
            </Box>
          ) : draggingField ? (
            <Box
              p="xs"
              style={{
                background: 'var(--mantine-color-white)',
                border: '1px solid var(--mantine-color-blue-5)',
                borderRadius: 'var(--mantine-radius-sm)',
                boxShadow: 'var(--mantine-shadow-md)',
                fontSize: 12,
              }}
            >
              {draggingField.label}
            </Box>
          ) : null}
        </DragOverlay>
      </DndContext>
    </Box>
  )
}

// ── Banner shown when the last save attempt was rejected by the publish guard
function PublishErrorsBanner({
  onJumpToField,
  onJumpToPage,
}: {
  onJumpToField: (pageId: string, fieldId: string) => void
  onJumpToPage: (pageId: string) => void
}) {
  const publishErrors = useBuilderStore((s) => s.publishErrors)
  const setPublishErrors = useBuilderStore((s) => s.setPublishErrors)

  if (publishErrors.length === 0) return null

  return (
    <Box
      mb="sm"
      p="xs"
      style={{
        borderRadius: 'var(--mantine-radius-sm)',
        background: 'var(--mantine-color-red-0)',
        border: '1px solid var(--mantine-color-red-4)',
      }}
    >
      <Group justify="space-between" mb={6}>
        <Text size="sm" fw={600} c="red.8">
          {publishErrors.length} issue{publishErrors.length === 1 ? '' : 's'} blocking publish
        </Text>
        <ActionIcon
          size="xs"
          variant="subtle"
          color="red"
          onClick={() => setPublishErrors([])}
          aria-label="Dismiss publish errors"
        >
          ×
        </ActionIcon>
      </Group>
      <Box component="ul" m={0} pl="md" style={{ listStyle: 'disc' }}>
        {publishErrors.map((e, i) => (
          <li key={i} style={{ fontSize: 12, marginBottom: 2 }}>
            <Text component="span" c="red.9">
              {e.message}
            </Text>{' '}
            {e.fieldId && e.pageId ? (
              <Text
                component="button"
                onClick={() => onJumpToField(e.pageId!, e.fieldId!)}
                c="blue"
                td="underline"
                size="xs"
                style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
              >
                jump to field
              </Text>
            ) : e.pageId ? (
              <Text
                component="button"
                onClick={() => onJumpToPage(e.pageId!)}
                c="blue"
                td="underline"
                size="xs"
                style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
              >
                jump to page
              </Text>
            ) : null}
            <Text component="span" c="dimmed" size="xs" ml={4}>
              ({e.code})
            </Text>
          </li>
        ))}
      </Box>
    </Box>
  )
}

// ── publish-guard plumbing ──────────────────────────────────────────────────

interface RawGuardDetail {
  code: string
  message: string
  path?: string[]
}

function extractGuardDetails(err: ApiError | undefined): RawGuardDetail[] | null {
  if (!err || err.status !== 422) return null
  const body = err.body as
    | { error?: { code?: string; details?: RawGuardDetail[] } }
    | null
  if (!body?.error || body.error.code !== 'publish_guard_failed') return null
  return Array.isArray(body.error.details) ? body.error.details : null
}

/**
 * Server error paths look like `["pages[1]", "fields[3]", "id"]`. Resolve the
 * indices against the spec we just attempted to save so each error knows the
 * page_id / field_id of the offending element (or null if the path doesn't
 * include one).
 */
function mapPublishErrors(
  details: RawGuardDetail[],
  spec: FormSpec,
): MappedPublishError[] {
  return details.map((d) => {
    const path = (d.path ?? []).join('.')
    let pageId: string | null = null
    let fieldId: string | null = null

    const pageMatch = /pages\[(\d+)\]/.exec(path)
    if (pageMatch) {
      const pi = Number(pageMatch[1])
      const page = spec.pages[pi]
      if (page) {
        pageId = page.id
        const fieldMatch = /fields\[(\d+)\]/.exec(path)
        if (fieldMatch) {
          const fi = Number(fieldMatch[1])
          fieldId = page.fields[fi]?.id ?? null
        }
      }
    }

    return {
      code: d.code,
      message: d.message,
      path,
      pageId,
      fieldId,
    }
  })
}
