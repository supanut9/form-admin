"use client"

import {
  Stack,
  Group,
  Text,
  Button,
  ActionIcon,
  Badge,
  Modal,
  NumberInput,
  TextInput,
  Switch,
  Box,
  Paper,
  Divider,
  Select,
  Tooltip,
  Alert,
} from '@mantine/core'
import { IconPlus, IconTrash, IconEdit, IconAlertCircle } from '@tabler/icons-react'
import { useState, useEffect, useMemo } from 'react'
import { useBuilderStore } from '@/lib/store'
import { setScoring } from '@/lib/logic-store-helpers'
import { RuleBuilder } from './rule-builder'
import type {
  ScoringRule,
  ScoringBucket,
  FormScoring,
  JsonLogicRule,
} from '@/lib/form-spec.types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 8)
  }
  return Math.random().toString(36).slice(2, 10)
}

function predicatePreview(rule: JsonLogicRule): string {
  try {
    const s = JSON.stringify(rule)
    return s.length > 60 ? s.slice(0, 57) + '...' : s
  } catch {
    return '(invalid)'
  }
}

// ── Overlap detection ─────────────────────────────────────────────────────────

interface OverlapError {
  a: number
  b: number
  message: string
}

function findOverlaps(buckets: ScoringBucket[]): OverlapError[] {
  const errors: OverlapError[] = []
  for (let i = 0; i < buckets.length; i++) {
    for (let j = i + 1; j < buckets.length; j++) {
      const a = buckets[i]!
      const b = buckets[j]!
      if (a.min <= b.max && b.min <= a.max) {
        errors.push({
          a: i,
          b: j,
          message: `Bucket "${a.label}" (${a.min}–${a.max}) overlaps with "${b.label}" (${b.min}–${b.max}).`,
        })
      }
    }
  }
  return errors
}

// ── Rule modal ────────────────────────────────────────────────────────────────

interface RuleModalProps {
  opened: boolean
  onClose: () => void
  initial?: ScoringRule | null
  onSave: (rule: ScoringRule) => void
}

function RuleModal({ opened, onClose, initial, onSave }: RuleModalProps) {
  const [predicate, setPredicate] = useState<JsonLogicRule | null>(null)
  const [action, setAction] = useState<'add' | 'set'>('add')
  const [value, setValue] = useState<number | string>(0)
  const isEdit = !!initial

  useEffect(() => {
    if (opened) {
      if (initial) {
        setPredicate(initial.if)
        if ('add' in initial.then) {
          setAction('add')
          setValue(initial.then.add)
        } else if ('set' in initial.then) {
          setAction('set')
          setValue(initial.then.set)
        }
      } else {
        setPredicate(null)
        setAction('add')
        setValue(0)
      }
    }
  }, [opened, initial])

  function handleSave() {
    const numVal = typeof value === 'number' ? value : Number(value) || 0
    const rule: ScoringRule = {
      if: predicate ?? {},
      then: action === 'add' ? { add: numVal } : { set: numVal },
    }
    onSave(rule)
    onClose()
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? 'Edit rule' : 'Add scoring rule'}
      size="lg"
    >
      <Stack gap="sm">
        <Box>
          <Text size="sm" fw={500} mb={6}>
            Condition (if)
          </Text>
          <RuleBuilder value={predicate} onChange={setPredicate} />
        </Box>
        <Group gap="sm" align="flex-end">
          <Select
            label="Action"
            data={[
              { value: 'add', label: 'Add points' },
              { value: 'set', label: 'Set score to' },
            ]}
            value={action}
            onChange={(v) => setAction((v as 'add' | 'set') ?? 'add')}
            style={{ width: 160 }}
          />
          <NumberInput
            label="Points"
            value={typeof value === 'number' ? value : Number(value) || 0}
            onChange={(v) => setValue(v)}
            style={{ flex: 1 }}
          />
        </Group>
        <Group justify="flex-end" mt="xs">
          <Button variant="light" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{isEdit ? 'Update' : 'Add rule'}</Button>
        </Group>
      </Stack>
    </Modal>
  )
}

// ── Bucket modal ──────────────────────────────────────────────────────────────

interface BucketModalProps {
  opened: boolean
  onClose: () => void
  initial?: ScoringBucket | null
  onSave: (bucket: ScoringBucket) => void
}

function BucketModal({ opened, onClose, initial, onSave }: BucketModalProps) {
  const [min, setMin] = useState<number | string>(0)
  const [max, setMax] = useState<number | string>(10)
  const [label, setLabel] = useState('')
  const isEdit = !!initial

  useEffect(() => {
    if (opened) {
      if (initial) {
        setMin(initial.min)
        setMax(initial.max)
        setLabel(initial.label)
      } else {
        setMin(0)
        setMax(10)
        setLabel('')
      }
    }
  }, [opened, initial])

  function handleSave() {
    const bucket: ScoringBucket = {
      min: typeof min === 'number' ? min : Number(min) || 0,
      max: typeof max === 'number' ? max : Number(max) || 0,
      label: label.trim(),
    }
    onSave(bucket)
    onClose()
  }

  const canSave = !!label.trim() && (typeof min === 'number' ? min : Number(min) || 0) <= (typeof max === 'number' ? max : Number(max) || 0)

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? 'Edit bucket' : 'Add score bucket'}
      size="sm"
    >
      <Stack gap="sm">
        <TextInput
          label="Label"
          placeholder="e.g. High, Low, Excellent"
          value={label}
          onChange={(e) => setLabel(e.currentTarget.value)}
          data-autofocus
        />
        <Group grow>
          <NumberInput
            label="Min score (inclusive)"
            value={typeof min === 'number' ? min : Number(min) || 0}
            onChange={(v) => setMin(v)}
          />
          <NumberInput
            label="Max score (inclusive)"
            value={typeof max === 'number' ? max : Number(max) || 0}
            onChange={(v) => setMax(v)}
          />
        </Group>
        <Group justify="flex-end" mt="xs">
          <Button variant="light" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isEdit ? 'Update' : 'Add bucket'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

// ── Live test panel ───────────────────────────────────────────────────────────

function LiveTestPanel() {
  const spec = useBuilderStore((s) => s.formSpec)
  const [testValues, setTestValues] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{ total: number; bucket: string | null } | null>(null)

  const allFields = useMemo(() => spec.pages.flatMap((p) => p.fields), [spec.pages])

  // Seed defaults from field types
  useEffect(() => {
    const defaults: Record<string, string> = {}
    for (const f of allFields) {
      if (f.type === 'number') defaults[f.id] = '0'
      else if (f.type === 'checkbox') defaults[f.id] = 'false'
      else defaults[f.id] = ''
    }
    setTestValues(defaults)
  }, [allFields])

  async function runTest() {
    const { computeScore } = await import('form-renderer')
    const { computeCalculations } = await import('form-renderer')
    const typedValues: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(testValues)) {
      const n = Number(v)
      typedValues[k] = isNaN(n) || v === '' ? v : n
    }
    const calcResults = await computeCalculations(spec, typedValues)
    const scoreResult = computeScore(spec, typedValues, calcResults)
    setResult({ total: scoreResult.total, bucket: scoreResult.bucket?.label ?? null })
  }

  if (!spec.scoring?.enabled) return null

  return (
    <Box
      mt="md"
      p="sm"
      style={{
        border: '1px solid var(--mantine-color-indigo-3)',
        borderRadius: 'var(--mantine-radius-sm)',
        background: 'var(--mantine-color-indigo-0)',
      }}
    >
      <Text size="sm" fw={600} mb="xs">
        Live test
      </Text>
      <Stack gap="xs">
        {allFields.slice(0, 6).map((f) => (
          <TextInput
            key={f.id}
            label={f.label}
            placeholder="Test value"
            size="xs"
            value={testValues[f.id] ?? ''}
            onChange={(e) =>
              setTestValues((prev) => ({ ...prev, [f.id]: e.currentTarget.value }))
            }
          />
        ))}
        {allFields.length > 6 && (
          <Text size="xs" c="dimmed">
            Showing first 6 fields only.
          </Text>
        )}
        <Button size="xs" variant="light" onClick={() => void runTest()}>
          Run
        </Button>
        {result !== null && (
          <Group gap="sm">
            <Text size="sm">
              Score: <strong>{result.total}</strong>
            </Text>
            {result.bucket && (
              <Badge color="indigo" variant="filled">
                {result.bucket}
              </Badge>
            )}
            {result.bucket === null && (
              <Text size="xs" c="dimmed">
                No matching bucket
              </Text>
            )}
          </Group>
        )}
      </Stack>
    </Box>
  )
}

// ── Main editor ───────────────────────────────────────────────────────────────

export function ScoringEditor() {
  const spec = useBuilderStore((s) => s.formSpec)
  const scoring = spec.scoring

  const [ruleModalOpen, setRuleModalOpen] = useState(false)
  const [editRuleIdx, setEditRuleIdx] = useState<number | null>(null)
  const [bucketModalOpen, setBucketModalOpen] = useState(false)
  const [editBucketIdx, setEditBucketIdx] = useState<number | null>(null)

  const enabled = scoring?.enabled ?? false
  const rules = scoring?.rules ?? []
  const buckets = scoring?.buckets ?? []

  const overlapErrors = useMemo(() => findOverlaps(buckets), [buckets])

  function toggleEnabled(val: boolean) {
    setScoring({
      enabled: val,
      rules: scoring?.rules ?? [],
      buckets: scoring?.buckets ?? [],
    })
  }

  function saveRule(rule: ScoringRule) {
    const current: FormScoring = {
      enabled,
      rules: [...rules],
      buckets: [...buckets],
    }
    if (editRuleIdx !== null) {
      current.rules[editRuleIdx] = rule
    } else {
      current.rules.push(rule)
    }
    setScoring(current)
    setEditRuleIdx(null)
  }

  function deleteRule(idx: number) {
    setScoring({
      enabled,
      rules: rules.filter((_, i) => i !== idx),
      buckets: [...buckets],
    })
  }

  function saveBucket(bucket: ScoringBucket) {
    const current: FormScoring = {
      enabled,
      rules: [...rules],
      buckets: [...buckets],
    }
    if (editBucketIdx !== null) {
      current.buckets![editBucketIdx] = bucket
    } else {
      current.buckets = [...(current.buckets ?? []), bucket]
    }
    setScoring(current)
    setEditBucketIdx(null)
  }

  function deleteBucket(idx: number) {
    setScoring({
      enabled,
      rules: [...rules],
      buckets: buckets.filter((_, i) => i !== idx),
    })
  }

  // Generate a unique key per rule for React list rendering
  const ruleKeys = useMemo(() => rules.map(() => uid()), [rules.length]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Stack gap="md" p="md">
      <Group justify="space-between">
        <Stack gap={0}>
          <Text fw={600} size="sm">
            Scoring
          </Text>
          <Text size="xs" c="dimmed">
            Award points based on field values. Assign score buckets for result messaging.
          </Text>
        </Stack>
        <Switch
          label="Enable scoring"
          checked={enabled}
          onChange={(e) => toggleEnabled(e.currentTarget.checked)}
        />
      </Group>

      {!enabled && (
        <Box
          p="md"
          style={{
            border: '2px dashed var(--mantine-color-gray-3)',
            borderRadius: 'var(--mantine-radius-sm)',
            textAlign: 'center',
          }}
        >
          <Text size="sm" c="dimmed">
            Enable scoring above to configure rules and buckets.
          </Text>
        </Box>
      )}

      {enabled && (
        <>
          {/* ── Rules section ── */}
          <Divider label="Scoring rules" labelPosition="left" />
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              Rules are evaluated in order. First matching rule wins (within a single rule
              application).
            </Text>
            <Button
              size="xs"
              leftSection={<IconPlus size={14} />}
              variant="light"
              onClick={() => {
                setEditRuleIdx(null)
                setRuleModalOpen(true)
              }}
            >
              Add rule
            </Button>
          </Group>

          {rules.length === 0 ? (
            <Box
              p="lg"
              style={{
                border: '2px dashed var(--mantine-color-gray-3)',
                borderRadius: 'var(--mantine-radius-sm)',
                textAlign: 'center',
              }}
            >
              <Text size="sm" c="dimmed">
                No rules yet.
              </Text>
            </Box>
          ) : (
            <Stack gap="xs">
              {rules.map((rule, idx) => {
                const action = 'add' in rule.then ? `add ${rule.then.add}` : `set ${rule.then.set}`
                return (
                  <Paper key={ruleKeys[idx] ?? idx} withBorder p="xs">
                    <Group justify="space-between" wrap="nowrap">
                      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                        <Text size="xs" c="dimmed" ff="monospace" truncate>
                          if {predicatePreview(rule.if)}
                        </Text>
                        <Badge size="xs" variant="light" color="violet">
                          then: {action}
                        </Badge>
                      </Stack>
                      <Group gap={4} wrap="nowrap">
                        <Tooltip label="Edit" withArrow>
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            onClick={() => {
                              setEditRuleIdx(idx)
                              setRuleModalOpen(true)
                            }}
                            aria-label={`Edit rule ${idx + 1}`}
                          >
                            <IconEdit size={14} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete" withArrow>
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            color="red"
                            onClick={() => deleteRule(idx)}
                            aria-label={`Delete rule ${idx + 1}`}
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
          )}

          {/* ── Buckets section ── */}
          <Divider label="Score buckets" labelPosition="left" />
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              Map score ranges to labels (e.g. 0–49 = Low, 50–100 = High).
            </Text>
            <Button
              size="xs"
              leftSection={<IconPlus size={14} />}
              variant="light"
              onClick={() => {
                setEditBucketIdx(null)
                setBucketModalOpen(true)
              }}
            >
              Add bucket
            </Button>
          </Group>

          {overlapErrors.length > 0 && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
              <Stack gap={4}>
                {overlapErrors.map((e, i) => (
                  <Text key={i} size="xs">
                    {e.message}
                  </Text>
                ))}
              </Stack>
            </Alert>
          )}

          {buckets.length === 0 ? (
            <Box
              p="lg"
              style={{
                border: '2px dashed var(--mantine-color-gray-3)',
                borderRadius: 'var(--mantine-radius-sm)',
                textAlign: 'center',
              }}
            >
              <Text size="sm" c="dimmed">
                No buckets yet.
              </Text>
            </Box>
          ) : (
            <Stack gap="xs">
              {buckets.map((bucket, idx) => {
                const hasOverlap = overlapErrors.some((e) => e.a === idx || e.b === idx)
                return (
                  <Paper
                    key={idx}
                    withBorder
                    p="xs"
                    style={{
                      borderColor: hasOverlap
                        ? 'var(--mantine-color-red-5)'
                        : 'var(--mantine-color-gray-3)',
                      background: hasOverlap ? 'var(--mantine-color-red-0)' : undefined,
                    }}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="xs">
                        <Badge variant="outline" size="sm">
                          {bucket.min} – {bucket.max}
                        </Badge>
                        <Text size="sm" fw={500}>
                          {bucket.label}
                        </Text>
                      </Group>
                      <Group gap={4}>
                        <Tooltip label="Edit" withArrow>
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            onClick={() => {
                              setEditBucketIdx(idx)
                              setBucketModalOpen(true)
                            }}
                            aria-label={`Edit bucket ${bucket.label}`}
                          >
                            <IconEdit size={14} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete" withArrow>
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            color="red"
                            onClick={() => deleteBucket(idx)}
                            aria-label={`Delete bucket ${bucket.label}`}
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
          )}

          <LiveTestPanel />
        </>
      )}

      <RuleModal
        opened={ruleModalOpen}
        onClose={() => {
          setRuleModalOpen(false)
          setEditRuleIdx(null)
        }}
        initial={editRuleIdx !== null ? rules[editRuleIdx] : null}
        onSave={saveRule}
      />

      <BucketModal
        opened={bucketModalOpen}
        onClose={() => {
          setBucketModalOpen(false)
          setEditBucketIdx(null)
        }}
        initial={editBucketIdx !== null ? buckets[editBucketIdx] : null}
        onSave={saveBucket}
      />
    </Stack>
  )
}
