"use client"

import { useEffect, useState } from 'react'
import { Box, Group, Button, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useBuilderStore } from '@/lib/store'
import { formClient, type ApiError } from '@/lib/form-client'
import { CalcEditor } from './calc-editor'
import { ScoringEditor } from './scoring-editor'
import { ActionEditor } from './action-editor'
import type { FormSpec } from '@/lib/form-spec.types'
import type { LogicTab } from './logic-tab-client'

interface LogicTabShellProps {
  formId: string
  initialSpec: FormSpec
  tab: LogicTab
}

export function LogicTabShell({ formId, initialSpec, tab }: LogicTabShellProps) {
  const { loadSpec, dirty, formSpec } = useBuilderStore()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSpec(initialSpec)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSpec.id])

  async function handleSave() {
    setSaving(true)
    try {
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
      const apiErr = err as ApiError | undefined
      const is422 = apiErr?.status === 422
      notifications.show({
        title: is422 ? 'Spec rejected' : 'Save failed',
        message: err instanceof Error ? err.message : 'Unknown error',
        color: 'red',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Save toolbar ── */}
      <Group
        p="xs"
        gap="xs"
        justify="flex-end"
        style={{
          borderBottom: '1px solid var(--mantine-color-gray-3)',
          background: 'var(--mantine-color-white)',
          flexShrink: 0,
        }}
      >
        {dirty && (
          <Text size="xs" c="dimmed">
            Unsaved changes
          </Text>
        )}
        <Button size="sm" loading={saving} onClick={handleSave} disabled={!dirty}>
          Save
        </Button>
      </Group>

      {/* ── Editor body ── */}
      <Box style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'logic' && <CalcEditor />}
        {tab === 'scoring' && <ScoringEditor />}
        {tab === 'actions' && <ActionEditor />}
      </Box>
    </Box>
  )
}
