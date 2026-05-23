"use client"

import { Stack, ColorInput, TextInput, Select, Textarea, Text } from '@mantine/core'
import { useBuilderStore } from '@/lib/store'

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Nunito', label: 'Nunito' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'system-ui', label: 'System UI' },
]

export function ThemeEditor() {
  const { formSpec, updateTheme } = useBuilderStore()
  const theme = formSpec.theme ?? { primary_color: '#4f46e5' }

  return (
    <Stack gap="sm" p="xs">
      <Text size="sm" fw={600}>
        Theme
      </Text>

      <ColorInput
        label="Primary color"
        value={theme.primary_color}
        onChange={(color) => updateTheme({ primary_color: color })}
        format="hex"
        swatches={['#4f46e5', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']}
      />

      <TextInput
        label="Logo URL"
        placeholder="https://example.com/logo.png"
        value={theme.logo_url ?? ''}
        onChange={(e) => updateTheme({ logo_url: e.currentTarget.value || undefined })}
      />

      <Select
        label="Font"
        data={FONT_OPTIONS}
        value={theme.font ?? null}
        onChange={(v) => updateTheme({ font: v ?? undefined })}
        placeholder="Default font"
        clearable
      />

      <Textarea
        label="Custom CSS"
        placeholder=".form-root { ... }"
        value={theme.custom_css ?? ''}
        onChange={(e) => updateTheme({ custom_css: e.currentTarget.value || undefined })}
        minRows={6}
        autosize
        styles={{ input: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
      />
    </Stack>
  )
}
