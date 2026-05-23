"use client"

import { Card, Stack, Text, SimpleGrid, Divider } from '@mantine/core'
import { useDraggable } from '@dnd-kit/core'
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
  IconLayoutBottombarCollapse,
} from '@tabler/icons-react'
import type { FormFieldType } from '@/lib/form-spec.types'

interface PaletteItemDef {
  id: string
  label: string
  icon: React.ComponentType<{ size?: number; color?: string }>
  isPaletteType: boolean
  fieldType?: FormFieldType
  action?: 'page-break'
}

const ITEMS: PaletteItemDef[] = [
  { id: 'palette:text', label: 'Short text', icon: IconLetterCase, isPaletteType: true, fieldType: 'text' },
  { id: 'palette:textarea', label: 'Long text', icon: IconAlignLeft, isPaletteType: true, fieldType: 'textarea' },
  { id: 'palette:number', label: 'Number', icon: IconNumbers, isPaletteType: true, fieldType: 'number' },
  { id: 'palette:email', label: 'Email', icon: IconMail, isPaletteType: true, fieldType: 'email' },
  { id: 'palette:phone', label: 'Phone', icon: IconPhone, isPaletteType: true, fieldType: 'phone' },
  { id: 'palette:select', label: 'Dropdown', icon: IconList, isPaletteType: true, fieldType: 'select' },
  { id: 'palette:multiselect', label: 'Multi-select', icon: IconListCheck, isPaletteType: true, fieldType: 'multiselect' },
  { id: 'palette:checkbox', label: 'Checkbox', icon: IconCheckbox, isPaletteType: true, fieldType: 'checkbox' },
  { id: 'palette:radio', label: 'Radio', icon: IconCircleDot, isPaletteType: true, fieldType: 'radio' },
  { id: 'palette:date', label: 'Date', icon: IconCalendar, isPaletteType: true, fieldType: 'date' },
  { id: 'palette:file', label: 'File upload', icon: IconPaperclip, isPaletteType: true, fieldType: 'file' },
  { id: 'palette:matrix', label: 'Matrix', icon: IconLayoutRows, isPaletteType: true, fieldType: 'matrix' },
]

const PAGE_BREAK_ITEM: PaletteItemDef = {
  id: 'palette:page-break',
  label: 'Page break',
  icon: IconLayoutBottombarCollapse,
  isPaletteType: false,
  action: 'page-break',
}

function PaletteCard({ item }: { item: PaletteItemDef }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { fieldType: item.fieldType, action: item.action, label: item.label },
  })

  const Icon = item.icon

  return (
    <Card
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      padding="xs"
      radius="sm"
      withBorder
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.5 : 1,
        userSelect: 'none',
      }}
    >
      <Stack gap={4} align="center">
        <Icon size={20} color="var(--mantine-color-blue-6)" />
        <Text size="xs" ta="center" lh={1.2}>
          {item.label}
        </Text>
      </Stack>
    </Card>
  )
}

export function Palette() {
  return (
    <Stack gap="xs" p="xs">
      <Text size="xs" fw={600} c="dimmed" tt="uppercase">
        Fields
      </Text>
      <SimpleGrid cols={2} spacing="xs">
        {ITEMS.map((item) => (
          <PaletteCard key={item.id} item={item} />
        ))}
      </SimpleGrid>
      <Divider />
      <Text size="xs" fw={600} c="dimmed" tt="uppercase">
        Layout
      </Text>
      <PaletteCard item={PAGE_BREAK_ITEM} />
    </Stack>
  )
}
