"use client"

import { Group, Text, Badge, ActionIcon, Box, Tooltip } from '@mantine/core'
import {
  IconLetterCase,
  IconAlignLeft,
  IconNumbers,
  IconMail,
  IconPhone,
  IconList,
  IconListCheck,
  IconCheckbox,
  IconCircleDot,
  IconCalendar,
  IconPaperclip,
  IconLayoutRows,
  IconEdit,
  IconCopy,
  IconTrash,
  IconGripVertical,
  IconEye,
} from '@tabler/icons-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useBuilderStore } from '@/lib/store'
import type { FormField } from '@/lib/form-spec.types'

const FIELD_ICONS: Record<FormField['type'], React.ComponentType<{ size?: number }>> = {
  text: IconLetterCase,
  textarea: IconAlignLeft,
  number: IconNumbers,
  email: IconMail,
  phone: IconPhone,
  select: IconList,
  multiselect: IconListCheck,
  checkbox: IconCheckbox,
  radio: IconCircleDot,
  date: IconCalendar,
  file: IconPaperclip,
  matrix: IconLayoutRows,
}

const FIELD_LABELS: Record<FormField['type'], string> = {
  text: 'Short text',
  textarea: 'Long text',
  number: 'Number',
  email: 'Email',
  phone: 'Phone',
  select: 'Dropdown',
  multiselect: 'Multi-select',
  checkbox: 'Checkbox',
  radio: 'Radio',
  date: 'Date',
  file: 'File',
  matrix: 'Matrix',
}

interface FieldCardProps {
  field: FormField
  pageId: string
  onDuplicate: (field: FormField, pageId: string) => void
}

export function FieldCard({ field, pageId, onDuplicate }: FieldCardProps) {
  const { selectedFieldId, setSelectedField, removeField } = useBuilderStore()
  const publishErrors = useBuilderStore((s) => s.publishErrors)
  const fieldErrors = publishErrors.filter((e) => e.fieldId === field.id)
  const hasError = fieldErrors.length > 0
  const isSelected = selectedFieldId === field.id

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
    data: { type: 'field', pageId },
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const Icon = FIELD_ICONS[field.type]

  return (
    <Box
      ref={setNodeRef}
      style={style}
      onClick={() => setSelectedField(field.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') setSelectedField(field.id)
      }}
    >
      <Box
        p="xs"
        style={{
          border: `1px solid ${
            hasError
              ? 'var(--mantine-color-red-5)'
              : isSelected
                ? 'var(--mantine-color-blue-5)'
                : 'var(--mantine-color-gray-3)'
          }`,
          borderRadius: 'var(--mantine-radius-sm)',
          background: hasError
            ? 'var(--mantine-color-red-0)'
            : isSelected
              ? 'var(--mantine-color-blue-0)'
              : 'var(--mantine-color-white)',
          cursor: 'pointer',
          position: 'relative',
        }}
        className="field-card-wrapper"
        title={hasError ? fieldErrors.map((e) => e.message).join('; ') : undefined}
      >
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
            <Box
              {...listeners}
              {...attributes}
              style={{ cursor: isDragging ? 'grabbing' : 'grab', color: 'var(--mantine-color-gray-5)' }}
            >
              <IconGripVertical size={16} />
            </Box>
            <Icon size={16} />
            <Text size="sm" truncate style={{ flex: 1 }}>
              {field.label}
            </Text>
            {field.required && (
              <Text size="xs" c="red" fw={500}>
                *
              </Text>
            )}
          </Group>
          <Group gap={4} wrap="nowrap">
            {hasError && (
              <Tooltip label={fieldErrors.map((e) => e.message).join('; ')} withArrow>
                <Badge size="xs" variant="filled" color="red">
                  error
                </Badge>
              </Tooltip>
            )}
            {field.show_if != null && (
              <Tooltip label="Conditional — only shown when rule matches" withArrow>
                <Badge
                  size="xs"
                  variant="light"
                  color="indigo"
                  leftSection={<IconEye size={10} />}
                >
                  if
                </Badge>
              </Tooltip>
            )}
            <Badge size="xs" variant="light" color="gray">
              {FIELD_LABELS[field.type]}
            </Badge>
            <ActionIcon
              size="xs"
              variant="subtle"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedField(field.id)
              }}
              aria-label="Edit field"
            >
              <IconEdit size={14} />
            </ActionIcon>
            <ActionIcon
              size="xs"
              variant="subtle"
              onClick={(e) => {
                e.stopPropagation()
                onDuplicate(field, pageId)
              }}
              aria-label="Duplicate field"
            >
              <IconCopy size={14} />
            </ActionIcon>
            <ActionIcon
              size="xs"
              variant="subtle"
              color="red"
              onClick={(e) => {
                e.stopPropagation()
                removeField(field.id)
              }}
              aria-label="Delete field"
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        </Group>
      </Box>
    </Box>
  )
}
