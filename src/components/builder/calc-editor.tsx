"use client"

import {
  Stack,
  Group,
  Text,
  Button,
  ActionIcon,
  Badge,
  Modal,
  TextInput,
  Textarea,
  Switch,
  Box,
  Paper,
  Divider,
  Tooltip,
} from '@mantine/core'
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconGripVertical,
  IconMath,
} from '@tabler/icons-react'
import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useBuilderStore } from '@/lib/store'
import {
  addCalculation,
  updateCalculation,
  removeCalculation,
  reorderCalculations,
} from '@/lib/logic-store-helpers'
import type { FormCalculation } from '@/lib/form-spec.types'

// ── ID generation & slug validation ──────────────────────────────────────────

function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 8)
  }
  return Math.random().toString(36).slice(2, 10)
}

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/__+/g, '_')
    .replace(/^_|_$/g, '')
}

function isValidSlug(s: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(s)
}

// ── Live formula syntax check via HyperFormula (lazy) ────────────────────────

/**
 * Validates a formula string by running it through form-renderer's
 * computeCalculations with a minimal stub spec. Returns an error string or
 * null if valid. Lazily imports form-renderer so HyperFormula only loads
 * when this tab is open.
 */
async function validateFormula(formula: string): Promise<string | null> {
  if (!formula.trim()) return null
  try {
    const { computeCalculations } = await import('form-renderer')
    const stubSpec = {
      id: '__validate__',
      version: 0,
      title: '',
      type: 'dynamic' as const,
      access: { mode: 'public_anonymous' as const, require_account: false, anonymous_allowed: true },
      pages: [],
      calculations: [{ id: 'calc_test', label: 'test', formula }],
    }
    const results = await computeCalculations(stubSpec, {})
    // null result indicates HF returned an error cell
    if (results['calc_test'] === null) {
      return 'Formula returned an error (check field IDs and function names).'
    }
    return null
  } catch (err) {
    return err instanceof Error ? err.message : 'Invalid formula'
  }
}

// ── Modal for add / edit ──────────────────────────────────────────────────────

interface CalcModalProps {
  opened: boolean
  onClose: () => void
  initial?: FormCalculation | null
  existingIds: string[]
}

function CalcModal({ opened, onClose, initial, existingIds }: CalcModalProps) {
  const [id, setId] = useState('')
  const [label, setLabel] = useState('')
  const [formula, setFormula] = useState('')
  const [hidden, setHidden] = useState(false)
  const [formulaError, setFormulaError] = useState<string | null>(null)
  const [idError, setIdError] = useState<string | null>(null)
  const isEdit = !!initial

  useEffect(() => {
    if (opened) {
      if (initial) {
        setId(initial.id)
        setLabel(initial.label)
        setFormula(initial.formula)
        setHidden(initial.hidden ?? false)
      } else {
        const generated = `calc_${uid()}`
        setId(generated)
        setLabel('')
        setFormula('')
        setHidden(false)
      }
      setFormulaError(null)
      setIdError(null)
    }
  }, [opened, initial])

  const checkFormula = useCallback(async (f: string) => {
    const err = await validateFormula(f)
    setFormulaError(err)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => void checkFormula(formula), 400)
    return () => clearTimeout(t)
  }, [formula, checkFormula])

  function handleIdChange(raw: string) {
    const cleaned = raw.startsWith('calc_')
      ? `calc_${slugify(raw.slice(5))}`
      : `calc_${slugify(raw)}`
    setId(cleaned)
    if (!isValidSlug(cleaned)) {
      setIdError('ID must be lowercase letters, digits, or underscores (e.g. calc_total).')
    } else if (!isEdit && existingIds.includes(cleaned)) {
      setIdError('This ID is already in use.')
    } else {
      setIdError(null)
    }
  }

  function handleSave() {
    if (!id || !label || !formula) return
    if (idError) return
    const calc: FormCalculation = { id, label, formula, hidden }
    if (isEdit) {
      updateCalculation(id, { label, formula, hidden })
    } else {
      addCalculation(calc)
    }
    onClose()
  }

  const canSave = !!id && !!label && !!formula && !idError

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? 'Edit calculation' : 'Add calculation'}
      size="lg"
    >
      <Stack gap="sm">
        <TextInput
          label="ID"
          description="Auto-prefixed with calc_. Used in formulas to reference this value."
          value={id}
          onChange={(e) => handleIdChange(e.currentTarget.value)}
          error={idError}
          disabled={isEdit}
          data-autofocus={!isEdit}
        />
        <TextInput
          label="Label"
          description="Human-readable name shown in the form results."
          placeholder="e.g. Total score"
          value={label}
          onChange={(e) => setLabel(e.currentTarget.value)}
          data-autofocus={isEdit}
        />
        <Box>
          <Textarea
            label="Formula"
            description="HyperFormula expression using field IDs as references (e.g. SUM(fld_a, fld_b))."
            placeholder="SUM(fld_qty, fld_price)"
            value={formula}
            onChange={(e) => setFormula(e.currentTarget.value)}
            autosize
            minRows={3}
            styles={{ input: { fontFamily: 'monospace', fontSize: 13 } }}
          />
          {formulaError && (
            <Text c="red" size="xs" mt={4}>
              {formulaError}
            </Text>
          )}
        </Box>
        <Switch
          label="Hidden (not shown to respondents)"
          checked={hidden}
          onChange={(e) => setHidden(e.currentTarget.checked)}
        />
        <Group justify="flex-end" mt="xs">
          <Button variant="light" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isEdit ? 'Update' : 'Add'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

// ── Sortable row ──────────────────────────────────────────────────────────────

interface CalcRowProps {
  calc: FormCalculation
  onEdit: (c: FormCalculation) => void
  onDelete: (id: string) => void
}

function CalcRow({ calc, onEdit, onDelete }: CalcRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: calc.id,
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <Box ref={setNodeRef} style={style}>
      <Paper
        withBorder
        p="xs"
        style={{
          borderColor: 'var(--mantine-color-gray-3)',
          background: 'var(--mantine-color-white)',
        }}
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
            <IconMath size={16} color="var(--mantine-color-indigo-6)" />
            <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
              <Group gap={6} wrap="nowrap">
                <Text size="sm" fw={500} truncate>
                  {calc.label}
                </Text>
                {calc.hidden && (
                  <Badge size="xs" variant="light" color="gray">
                    hidden
                  </Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed" ff="monospace" truncate>
                {calc.formula}
              </Text>
            </Stack>
          </Group>
          <Group gap={4} wrap="nowrap">
            <Badge size="xs" variant="outline" color="indigo">
              {calc.id}
            </Badge>
            <Tooltip label="Edit" withArrow>
              <ActionIcon
                size="xs"
                variant="subtle"
                onClick={() => onEdit(calc)}
                aria-label={`Edit ${calc.label}`}
              >
                <IconEdit size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Delete" withArrow>
              <ActionIcon
                size="xs"
                variant="subtle"
                color="red"
                onClick={() => onDelete(calc.id)}
                aria-label={`Delete ${calc.label}`}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Paper>
    </Box>
  )
}

// ── Main editor ───────────────────────────────────────────────────────────────

export function CalcEditor() {
  const calculations = useBuilderStore((s) => s.formSpec.calculations ?? [])
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<FormCalculation | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = calculations.map((c) => c.id)
    const oldIdx = ids.indexOf(String(active.id))
    const newIdx = ids.indexOf(String(over.id))
    if (oldIdx >= 0 && newIdx >= 0) {
      reorderCalculations(arrayMove(ids, oldIdx, newIdx))
    }
  }

  function openAdd() {
    setEditTarget(null)
    setModalOpen(true)
  }

  function openEdit(calc: FormCalculation) {
    setEditTarget(calc)
    setModalOpen(true)
  }

  return (
    <Stack gap="md" p="md">
      <Group justify="space-between">
        <Stack gap={0}>
          <Text fw={600} size="sm">
            Calculations
          </Text>
          <Text size="xs" c="dimmed">
            HyperFormula expressions evaluated against field values. Reference them as variables in
            scoring rules.
          </Text>
        </Stack>
        <Button
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={openAdd}
          variant="light"
        >
          Add calculation
        </Button>
      </Group>

      <Divider />

      {calculations.length === 0 ? (
        <Box
          p="xl"
          style={{
            border: '2px dashed var(--mantine-color-gray-3)',
            borderRadius: 'var(--mantine-radius-sm)',
            textAlign: 'center',
          }}
        >
          <Text size="sm" c="dimmed">
            No calculations yet. Click "Add calculation" to create one.
          </Text>
        </Box>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext
            items={calculations.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <Stack gap="xs">
              {calculations.map((calc) => (
                <CalcRow
                  key={calc.id}
                  calc={calc}
                  onEdit={openEdit}
                  onDelete={removeCalculation}
                />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
      )}

      <CalcModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editTarget}
        existingIds={calculations.map((c) => c.id)}
      />
    </Stack>
  )
}
