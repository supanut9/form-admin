"use client"

import { Stack, Group, Select, TextInput, Button, ActionIcon, Text, SegmentedControl, Divider } from '@mantine/core'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { useBuilderStore } from '@/lib/store'
import type { JsonLogicRule } from '@/lib/form-spec.types'

type Operator = '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'contains'
type Combinator = 'and' | 'or'

interface Clause {
  id: string
  fieldId: string
  operator: Operator
  value: string
}

interface RuleBuilderProps {
  value: JsonLogicRule | null
  onChange: (rule: JsonLogicRule | null) => void
}

const OPERATORS: { value: Operator; label: string }[] = [
  { value: '==', label: 'equals' },
  { value: '!=', label: 'not equals' },
  { value: '>', label: 'greater than' },
  { value: '<', label: 'less than' },
  { value: '>=', label: 'greater or equal' },
  { value: '<=', label: 'less or equal' },
  { value: 'in', label: 'in (array)' },
  { value: 'contains', label: 'contains' },
]

function clausesToJsonLogic(clauses: Clause[], combinator: Combinator): JsonLogicRule | null {
  if (clauses.length === 0) return null
  const rules = clauses
    .filter((c) => c.fieldId && c.value !== '')
    .map((c) => {
      const varExpr = { var: c.fieldId }
      const val = isNaN(Number(c.value)) ? c.value : Number(c.value)
      if (c.operator === 'in') {
        return { in: [varExpr, val] }
      }
      if (c.operator === 'contains') {
        return { in: [val, varExpr] }
      }
      return { [c.operator]: [varExpr, val] }
    })
  if (rules.length === 0) return null
  if (rules.length === 1) return rules[0] as JsonLogicRule
  return { [combinator]: rules } as JsonLogicRule
}

function jsonLogicToClauses(rule: JsonLogicRule | null): { clauses: Clause[]; combinator: Combinator } {
  const empty = { clauses: [], combinator: 'and' as Combinator }
  if (!rule || typeof rule !== 'object') return empty
  const r = rule as Record<string, unknown>
  const top = Object.keys(r)[0]
  if (!top) return empty

  function parseClause(expr: unknown): Clause | null {
    if (!expr || typeof expr !== 'object') return null
    const e = expr as Record<string, unknown>
    const op = Object.keys(e)[0] as Operator | undefined
    if (!op) return null
    const args = e[op]
    if (!Array.isArray(args) || args.length < 2) return null
    const lhs = args[0] as Record<string, string>
    const rhs = args[1]
    if (!lhs?.var) return null
    return { id: Math.random().toString(36).slice(2), fieldId: lhs.var, operator: op, value: String(rhs) }
  }

  if (top === 'and' || top === 'or') {
    const children = r[top] as unknown[]
    const clauses = children.map(parseClause).filter((c): c is Clause => c !== null)
    return { clauses, combinator: top as Combinator }
  }
  const single = parseClause(rule)
  return single ? { clauses: [single], combinator: 'and' } : empty
}

export function RuleBuilder({ value, onChange }: RuleBuilderProps) {
  const pages = useBuilderStore((s) => s.formSpec.pages)
  const fields = useMemo(() => pages.flatMap((p) => p.fields), [pages])

  const initial = jsonLogicToClauses(value)
  const [clauses, setClauses] = useState<Clause[]>(initial.clauses)
  const [combinator, setCombinator] = useState<Combinator>(initial.combinator)

  const fieldOptions = fields.map((f) => ({ value: f.id, label: f.label }))

  function updateClauses(next: Clause[]) {
    setClauses(next)
    onChange(clausesToJsonLogic(next, combinator))
  }

  function updateCombinator(val: Combinator) {
    setCombinator(val)
    onChange(clausesToJsonLogic(clauses, val))
  }

  function addClause() {
    const next = [
      ...clauses,
      { id: Math.random().toString(36).slice(2), fieldId: '', operator: '==' as Operator, value: '' },
    ]
    updateClauses(next)
  }

  function removeClause(id: string) {
    updateClauses(clauses.filter((c) => c.id !== id))
  }

  function updateClause(id: string, patch: Partial<Clause>) {
    updateClauses(clauses.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  return (
    <Stack gap="sm">
      {clauses.length > 1 && (
        <Group gap="xs" align="center">
          <Text size="sm">Match</Text>
          <SegmentedControl
            size="xs"
            value={combinator}
            onChange={(v) => updateCombinator(v as Combinator)}
            data={[
              { label: 'ALL (AND)', value: 'and' },
              { label: 'ANY (OR)', value: 'or' },
            ]}
          />
          <Text size="sm">conditions</Text>
        </Group>
      )}

      {clauses.map((clause, idx) => (
        <Stack key={clause.id} gap={4}>
          {idx > 0 && (
            <Text size="xs" c="dimmed" ta="center">
              {combinator === 'and' ? 'AND' : 'OR'}
            </Text>
          )}
          <Group gap="xs" align="flex-end" wrap="nowrap">
            <Select
              label={idx === 0 ? 'Field' : undefined}
              placeholder="Pick a field"
              data={fieldOptions}
              value={clause.fieldId || null}
              onChange={(v) => updateClause(clause.id, { fieldId: v ?? '' })}
              style={{ flex: 2 }}
              size="sm"
            />
            <Select
              label={idx === 0 ? 'Operator' : undefined}
              data={OPERATORS}
              value={clause.operator}
              onChange={(v) => updateClause(clause.id, { operator: (v as Operator) ?? '==' })}
              style={{ flex: 2 }}
              size="sm"
            />
            <TextInput
              label={idx === 0 ? 'Value' : undefined}
              placeholder="Value"
              value={clause.value}
              onChange={(e) => updateClause(clause.id, { value: e.currentTarget.value })}
              style={{ flex: 2 }}
              size="sm"
            />
            <ActionIcon
              color="red"
              variant="subtle"
              onClick={() => removeClause(clause.id)}
              aria-label="Remove condition"
              mb={idx === 0 ? 0 : undefined}
              style={{ alignSelf: idx === 0 ? 'flex-end' : 'center' }}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        </Stack>
      ))}

      <Divider />
      <Button
        leftSection={<IconPlus size={14} />}
        variant="subtle"
        size="xs"
        onClick={addClause}
        disabled={fieldOptions.length === 0}
      >
        Add condition
      </Button>

      {fieldOptions.length === 0 && (
        <Text size="xs" c="dimmed">
          Add fields to the form before building conditions.
        </Text>
      )}
    </Stack>
  )
}
