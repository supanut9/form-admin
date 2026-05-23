"use client"

import {
  Stack,
  Text,
  TextInput,
  Textarea,
  Switch,
  NumberInput,
  Select,
  Button,
  ActionIcon,
  Group,
  Divider,
  ScrollArea,
  Badge,
} from '@mantine/core'
import {
  IconPlus,
  IconTrash,
  IconArrowUp,
  IconArrowDown,
  IconCopy,
} from '@tabler/icons-react'
import { useBuilderStore } from '@/lib/store'
import { RuleBuilder } from './rule-builder'
import { ThemeEditor } from './theme-editor'
import type {
  FormField,
  FormAccess,
  FormPrefillConfig,
  SelectOption,
  JsonLogicRule,
} from '@/lib/form-spec.types'

// ── Options editor (select, multiselect, radio, checkbox) ────────────────────
function OptionsEditor({ options, onChange }: { options: SelectOption[]; onChange: (opts: SelectOption[]) => void }) {
  function add() {
    onChange([...options, { value: `opt_${Date.now().toString(36)}`, label: 'New option' }])
  }
  function remove(idx: number) {
    onChange(options.filter((_, i) => i !== idx))
  }
  function move(from: number, to: number) {
    if (to < 0 || to >= options.length) return
    const next = [...options]
    const [picked] = next.splice(from, 1)
    next.splice(to, 0, picked!)
    onChange(next)
  }
  function duplicate(idx: number) {
    const src = options[idx]
    if (!src) return
    const copy = {
      value: `${src.value}_copy`,
      label: `${src.label} (copy)`,
    }
    const next = [...options]
    next.splice(idx + 1, 0, copy)
    onChange(next)
  }
  function updateLabel(idx: number, label: string) {
    onChange(
      options.map((o, i) =>
        i === idx
          ? {
              ...o,
              label,
              // Auto-sync value from label only if the original value is empty
              // or was clearly derived from the label (so manual edits stick).
              value:
                o.value && o.value !== labelToSlug(o.label)
                  ? o.value
                  : labelToSlug(label),
            }
          : o,
      ),
    )
  }
  function updateValue(idx: number, value: string) {
    onChange(options.map((o, i) => (i === idx ? { ...o, value } : o)))
  }
  return (
    <Stack gap="xs">
      <Group gap={6} align="center">
        <Text size="xs" fw={600}>
          Options
        </Text>
        <Text size="xs" c="dimmed">
          ({options.length})
        </Text>
      </Group>
      {options.length === 0 && (
        <Text size="xs" c="dimmed">
          No options yet. Add at least one to make this field usable.
        </Text>
      )}
      {options.map((opt, idx) => (
        <Group key={idx} gap={4} align="flex-end" wrap="nowrap">
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <TextInput
              label={idx === 0 ? 'Label' : undefined}
              size="xs"
              value={opt.label}
              onChange={(e) => updateLabel(idx, e.currentTarget.value)}
            />
            <TextInput
              size="xs"
              value={opt.value}
              onChange={(e) => updateValue(idx, e.currentTarget.value)}
              placeholder="value (auto from label)"
              styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
            />
          </Stack>
          <Stack gap={2}>
            <Group gap={2}>
              <ActionIcon
                size="xs"
                variant="subtle"
                disabled={idx === 0}
                onClick={() => move(idx, idx - 1)}
                aria-label="Move option up"
              >
                <IconArrowUp size={12} />
              </ActionIcon>
              <ActionIcon
                size="xs"
                variant="subtle"
                disabled={idx === options.length - 1}
                onClick={() => move(idx, idx + 1)}
                aria-label="Move option down"
              >
                <IconArrowDown size={12} />
              </ActionIcon>
            </Group>
            <Group gap={2}>
              <ActionIcon
                size="xs"
                variant="subtle"
                onClick={() => duplicate(idx)}
                aria-label="Duplicate option"
              >
                <IconCopy size={12} />
              </ActionIcon>
              <ActionIcon
                size="xs"
                color="red"
                variant="subtle"
                onClick={() => remove(idx)}
                aria-label="Remove option"
              >
                <IconTrash size={12} />
              </ActionIcon>
            </Group>
          </Stack>
        </Group>
      ))}
      <Button size="xs" variant="subtle" leftSection={<IconPlus size={12} />} onClick={add}>
        Add option
      </Button>
    </Stack>
  )
}

function labelToSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

// ── Field-type-specific controls ─────────────────────────────────────────────
function FieldTypeControls({ field }: { field: FormField }) {
  const { updateField } = useBuilderStore()
  const update = (patch: Partial<FormField>) => updateField(field.id, patch)

  switch (field.type) {
    case 'text':
    case 'textarea':
      return (
        <>
          <TextInput
            label="Placeholder"
            size="xs"
            value={field.placeholder ?? ''}
            onChange={(e) => update({ placeholder: e.currentTarget.value || undefined } as Partial<FormField>)}
          />
          {field.type === 'textarea' && (
            <NumberInput
              label="Rows"
              size="xs"
              min={2}
              max={20}
              value={field.rows ?? ''}
              onChange={(v) => update({ rows: v ? Number(v) : undefined } as Partial<FormField>)}
            />
          )}
          <NumberInput
            label="Min length"
            size="xs"
            min={0}
            value={field.validation?.min_length ?? ''}
            onChange={(v) =>
              update({ validation: { ...(field.validation ?? {}), min_length: v ? Number(v) : undefined } } as Partial<FormField>)
            }
          />
          <NumberInput
            label="Max length"
            size="xs"
            min={1}
            value={field.validation?.max_length ?? ''}
            onChange={(v) =>
              update({ validation: { ...(field.validation ?? {}), max_length: v ? Number(v) : undefined } } as Partial<FormField>)
            }
          />
          <TextInput
            label="Regex pattern"
            size="xs"
            value={field.validation?.pattern ?? ''}
            onChange={(e) =>
              update({ validation: { ...(field.validation ?? {}), pattern: e.currentTarget.value || undefined } } as Partial<FormField>)
            }
          />
        </>
      )
    case 'number':
      return (
        <>
          <TextInput
            label="Placeholder"
            size="xs"
            value={field.placeholder ?? ''}
            onChange={(e) => update({ placeholder: e.currentTarget.value || undefined } as Partial<FormField>)}
          />
          <NumberInput
            label="Min"
            size="xs"
            value={field.validation?.min ?? ''}
            onChange={(v) => update({ validation: { ...(field.validation ?? {}), min: v !== '' ? Number(v) : undefined } } as Partial<FormField>)}
          />
          <NumberInput
            label="Max"
            size="xs"
            value={field.validation?.max ?? ''}
            onChange={(v) => update({ validation: { ...(field.validation ?? {}), max: v !== '' ? Number(v) : undefined } } as Partial<FormField>)}
          />
          <Switch
            label="Integers only"
            size="xs"
            checked={field.validation?.integer_only ?? false}
            onChange={(e) => update({ validation: { ...(field.validation ?? {}), integer_only: e.currentTarget.checked } } as Partial<FormField>)}
          />
        </>
      )
    case 'email':
      return (
        <TextInput
          label="Placeholder"
          size="xs"
          value={field.placeholder ?? ''}
          onChange={(e) => update({ placeholder: e.currentTarget.value || undefined } as Partial<FormField>)}
        />
      )
    case 'phone':
      return (
        <>
          <TextInput
            label="Placeholder"
            size="xs"
            value={field.placeholder ?? ''}
            onChange={(e) => update({ placeholder: e.currentTarget.value || undefined } as Partial<FormField>)}
          />
          <TextInput
            label="Default country code"
            placeholder="+66"
            size="xs"
            value={field.default_country_code ?? ''}
            onChange={(e) => update({ default_country_code: e.currentTarget.value || undefined } as Partial<FormField>)}
          />
        </>
      )
    case 'select':
    case 'radio':
      return (
        <>
          <OptionsEditor
            options={field.options}
            onChange={(opts) => update({ options: opts } as Partial<FormField>)}
          />
          <Switch
            label="Allow 'Other' freetext"
            size="xs"
            checked={field.allow_other ?? false}
            onChange={(e) => update({ allow_other: e.currentTarget.checked } as Partial<FormField>)}
          />
        </>
      )
    case 'multiselect':
      return (
        <>
          <OptionsEditor
            options={field.options}
            onChange={(opts) => update({ options: opts } as Partial<FormField>)}
          />
          <NumberInput
            label="Min selections"
            size="xs"
            min={0}
            value={field.min_selections ?? ''}
            onChange={(v) => update({ min_selections: v ? Number(v) : undefined } as Partial<FormField>)}
          />
          <NumberInput
            label="Max selections"
            size="xs"
            min={1}
            value={field.max_selections ?? ''}
            onChange={(v) => update({ max_selections: v ? Number(v) : undefined } as Partial<FormField>)}
          />
        </>
      )
    case 'checkbox':
      return (
        <OptionsEditor
          options={field.options ?? []}
          onChange={(opts) => update({ options: opts.length ? opts : undefined } as Partial<FormField>)}
        />
      )
    case 'date':
      return (
        <>
          <TextInput
            label="Min date"
            placeholder="YYYY-MM-DD"
            size="xs"
            value={field.min_date ?? ''}
            onChange={(e) => update({ min_date: e.currentTarget.value || undefined } as Partial<FormField>)}
          />
          <TextInput
            label="Max date"
            placeholder="YYYY-MM-DD"
            size="xs"
            value={field.max_date ?? ''}
            onChange={(e) => update({ max_date: e.currentTarget.value || undefined } as Partial<FormField>)}
          />
          <Switch
            label="Include time"
            size="xs"
            checked={field.include_time ?? false}
            onChange={(e) => update({ include_time: e.currentTarget.checked } as Partial<FormField>)}
          />
        </>
      )
    case 'file':
      return (
        <>
          <NumberInput
            label="Max file size (bytes)"
            size="xs"
            min={0}
            value={field.validation?.max_size_bytes ?? ''}
            onChange={(v) =>
              update({ validation: { ...(field.validation ?? {}), max_size_bytes: v ? Number(v) : undefined } } as Partial<FormField>)
            }
          />
          <NumberInput
            label="Max files"
            size="xs"
            min={1}
            value={field.validation?.max_files ?? ''}
            onChange={(v) =>
              update({ validation: { ...(field.validation ?? {}), max_files: v ? Number(v) : undefined } } as Partial<FormField>)
            }
          />
          <TextInput
            label="Allowed MIME types (comma-separated)"
            size="xs"
            value={(field.validation?.allowed_mime_types ?? []).join(', ')}
            onChange={(e) =>
              update({
                validation: {
                  ...(field.validation ?? {}),
                  allowed_mime_types: e.currentTarget.value
                    ? e.currentTarget.value.split(',').map((s) => s.trim())
                    : undefined,
                },
              } as Partial<FormField>)
            }
          />
        </>
      )
    case 'matrix':
      return (
        <>
          <TextInput
            label="Rows from field (field id)"
            size="xs"
            value={field.rows_from_field ?? ''}
            onChange={(e) => update({ rows_from_field: e.currentTarget.value || undefined } as Partial<FormField>)}
          />
          <Switch
            label="All cells required"
            size="xs"
            checked={field.required_all ?? false}
            onChange={(e) => update({ required_all: e.currentTarget.checked } as Partial<FormField>)}
          />
        </>
      )
    default:
      return null
  }
}

// ── Form settings panel (shown when no field selected) ────────────────────────
function FormSettingsPanel() {
  const { formSpec, updateAccess, setThankYou, updatePrefill } = useBuilderStore()
  const prefill: FormPrefillConfig = formSpec.prefill ?? {
    mode: 'none',
    identity: 'authenticated',
    submit_behavior: 'append',
  }

  return (
    <Stack gap="sm" p="xs">
      <Text size="sm" fw={600}>Form settings</Text>

      <TextInput label="Title" size="xs" value={formSpec.title} readOnly description="Edit in the toolbar" />
      <TextInput label="Slug" size="xs" value={formSpec.id} readOnly description="Set by form-api on creation" />

      <Select
        label="Access mode"
        size="xs"
        value={formSpec.access.mode}
        onChange={(v) => updateAccess({ mode: (v as FormAccess['mode']) ?? 'public_anonymous' })}
        data={[
          { value: 'public_anonymous', label: 'Public (anonymous)' },
          { value: 'private_oidc', label: 'Private (OIDC required)' },
          { value: 'link_token', label: 'Link token' },
        ]}
      />

      <Switch
        label="Require account"
        size="xs"
        checked={formSpec.access.require_account}
        onChange={(e) => updateAccess({ require_account: e.currentTarget.checked })}
      />

      <Switch
        label="Allow anonymous"
        size="xs"
        checked={formSpec.access.anonymous_allowed}
        onChange={(e) => updateAccess({ anonymous_allowed: e.currentTarget.checked })}
      />

      <Divider label="Thank you page" labelPosition="center" />

      <TextInput
        label="Thank you title"
        size="xs"
        value={formSpec.thank_you?.title ?? ''}
        onChange={(e) => setThankYou({ title: e.currentTarget.value })}
      />
      <Textarea
        label="Body (Markdown)"
        size="xs"
        rows={3}
        value={formSpec.thank_you?.body_md ?? ''}
        onChange={(e) => setThankYou({ body_md: e.currentTarget.value || undefined })}
      />
      <TextInput
        label="Redirect URL template"
        placeholder="{return_url}?event={event_key}"
        size="xs"
        value={formSpec.thank_you?.redirect_url_template ?? ''}
        onChange={(e) => setThankYou({ redirect_url_template: e.currentTarget.value || undefined })}
      />

      <Divider label="Prefill" labelPosition="center" />
      <Select
        label="Mode"
        size="xs"
        value={prefill.mode}
        onChange={(v) => updatePrefill({ mode: (v as FormPrefillConfig['mode']) ?? 'none' })}
        data={[
          { value: 'none', label: 'None — always blank' },
          { value: 'last_submission', label: 'Last submission — load prior values' },
        ]}
        description="When enabled, returning visitors see their previous answers as defaults."
      />
      {prefill.mode === 'last_submission' && (
        <>
          <Select
            label="Match by"
            size="xs"
            value={prefill.identity}
            onChange={(v) =>
              updatePrefill({ identity: (v as FormPrefillConfig['identity']) ?? 'authenticated' })
            }
            data={[
              { value: 'authenticated', label: 'Logged-in user (account_id)' },
              {
                value: 'both',
                label: 'Account OR anonymous cookie',
              },
            ]}
            description="“Both” enables prefill for anonymous visitors via the form_anon cookie — convenient, but a shared browser will show the prior visitor’s answers."
          />
          <Select
            label="On resubmit"
            size="xs"
            value={prefill.submit_behavior}
            onChange={(v) =>
              updatePrefill({
                submit_behavior: (v as FormPrefillConfig['submit_behavior']) ?? 'append',
              })
            }
            data={[
              { value: 'append', label: 'Append — every submit is a new row' },
              {
                value: 'replace',
                label: 'Replace — soft-delete the previous submission',
              },
            ]}
            description="Use Replace for “single answer” forms like a profile. Append keeps a full history."
          />
        </>
      )}

      <Divider label="Branding & theme" labelPosition="center" />
      <ThemeEditor />
    </Stack>
  )
}

// ── Inspector root ────────────────────────────────────────────────────────────
export function Inspector() {
  const { formSpec, selectedFieldId, updateField } = useBuilderStore()

  const selectedField = selectedFieldId
    ? formSpec.pages.flatMap((p) => p.fields).find((f) => f.id === selectedFieldId) ?? null
    : null

  if (!selectedField) return <FormSettingsPanel />

  const update = (patch: Partial<FormField>) => updateField(selectedField.id, patch)

  return (
    <ScrollArea h="100%" p={0}>
      <Stack gap="sm" p="xs">
        <Group justify="space-between">
          <Text size="sm" fw={600}>Field inspector</Text>
          <Badge size="xs" variant="light">{selectedField.type}</Badge>
        </Group>

        <TextInput
          label="Label"
          size="xs"
          value={selectedField.label}
          onChange={(e) => update({ label: e.currentTarget.value } as Partial<FormField>)}
        />

        <Textarea
          label="Help text"
          size="xs"
          rows={2}
          value={selectedField.help_text ?? ''}
          onChange={(e) => update({ help_text: e.currentTarget.value || undefined } as Partial<FormField>)}
        />

        <Switch
          label="Required"
          size="xs"
          checked={selectedField.required}
          onChange={(e) => update({ required: e.currentTarget.checked } as Partial<FormField>)}
        />

        {formSpec.prefill?.mode === 'last_submission' && (
          <Switch
            label="Prefill this field on revisit"
            description="Off: this field always starts blank, even when the visitor has submitted before."
            size="xs"
            checked={selectedField.prefill !== false}
            onChange={(e) => update({ prefill: e.currentTarget.checked } as Partial<FormField>)}
          />
        )}

        <Select
          label="Auto-fill from account"
          description="When the visitor is signed in, fill this field from their OIDC profile claim. Their previous answer (if any) still wins."
          size="xs"
          clearable
          value={(selectedField as { auth_field?: 'email' | 'name' | 'sub' }).auth_field ?? null}
          onChange={(v) =>
            update({
              auth_field: (v as 'email' | 'name' | 'sub' | null) ?? undefined,
            } as Partial<FormField>)
          }
          data={[
            { value: 'email', label: 'Account email' },
            { value: 'name', label: 'Account name' },
            { value: 'sub', label: 'Account id (sub)' },
          ]}
        />

        <Divider />
        <FieldTypeControls field={selectedField} />

        <Divider label="Show condition" labelPosition="center" />
        <RuleBuilder
          value={selectedField.show_if ?? null}
          onChange={(rule: JsonLogicRule | null) => update({ show_if: rule } as Partial<FormField>)}
        />
      </Stack>
    </ScrollArea>
  )
}
