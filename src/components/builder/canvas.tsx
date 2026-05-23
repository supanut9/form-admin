"use client"

import { Stack, Box, Text, Paper } from '@mantine/core'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useBuilderStore } from '@/lib/store'
import { FieldCard } from './field-card'
import type { FormField, FormPage } from '@/lib/form-spec.types'

export const CANVAS_DROP_ID = 'canvas-drop'

interface PageBlockProps {
  page: FormPage
}

function PageBlock({ page }: PageBlockProps) {
  const { addField, updateField, formSpec } = useBuilderStore()
  const fieldIds = page.fields.map((f) => f.id)

  function handleDuplicate(field: FormField, pageId: string) {
    const idx = page.fields.findIndex((f) => f.id === field.id)
    addField(pageId, field.type, idx + 1)
    const newField = useBuilderStore
      .getState()
      .formSpec.pages.find((p) => p.id === pageId)?.fields[idx + 1]
    if (newField) {
      updateField(newField.id, { label: `${field.label} (copy)` } as Partial<FormField>)
    }
    void formSpec
  }

  return (
    <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
      <Stack gap="xs">
        {page.fields.length === 0 && (
          <Box
            p="xl"
            style={{
              border: '2px dashed var(--mantine-color-gray-3)',
              borderRadius: 'var(--mantine-radius-sm)',
              textAlign: 'center',
              minHeight: 120,
            }}
          >
            <Text size="sm" c="dimmed">
              Drag fields here from the palette
            </Text>
          </Box>
        )}
        {page.fields.map((field) => (
          <FieldCard
            key={field.id}
            field={field}
            pageId={page.id}
            onDuplicate={handleDuplicate}
          />
        ))}
      </Stack>
    </SortableContext>
  )
}

interface CanvasProps {
  activePageId: string | null
}

export function Canvas({ activePageId }: CanvasProps) {
  const { formSpec } = useBuilderStore()
  const page = formSpec.pages.find((p) => p.id === activePageId) ?? formSpec.pages[0]

  const { setNodeRef, isOver } = useDroppable({
    id: CANVAS_DROP_ID,
    data: { pageId: page?.id },
  })

  if (!page) {
    return (
      <Box p="xl">
        <Text c="dimmed">No pages yet. Add a page to get started.</Text>
      </Box>
    )
  }

  return (
    <Paper
      ref={setNodeRef}
      withBorder
      p="md"
      style={{
        flex: 1,
        minHeight: 400,
        background: isOver ? 'var(--mantine-color-blue-0)' : undefined,
        transition: 'background 120ms',
      }}
    >
      <PageBlock page={page} />
    </Paper>
  )
}
