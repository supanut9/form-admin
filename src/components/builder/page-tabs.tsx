"use client"

import { Group, Tabs, ActionIcon, Menu, Button, TextInput, Modal } from '@mantine/core'
import {
  IconPlus,
  IconDotsVertical,
  IconTrash,
  IconPencil,
  IconEye,
} from '@tabler/icons-react'
import { useState } from 'react'
import { useBuilderStore } from '@/lib/store'
import { RuleBuilder } from './rule-builder'
import type { JsonLogicRule } from '@/lib/form-spec.types'

interface PageTabsProps {
  activePageId: string | null
  onChangeActive: (id: string) => void
}

export function PageTabs({ activePageId, onChangeActive }: PageTabsProps) {
  const { formSpec, addPage, removePage, updateField: _updateField, setSelectedPage } = useBuilderStore()
  const publishErrors = useBuilderStore((s) => s.publishErrors)
  const pages = formSpec.pages

  const [renameModal, setRenameModal] = useState<{ open: boolean; pageId: string; current: string }>({
    open: false,
    pageId: '',
    current: '',
  })
  const [ruleModal, setRuleModal] = useState<{ open: boolean; pageId: string; rule: JsonLogicRule | null }>({
    open: false,
    pageId: '',
    rule: null,
  })
  const [renameValue, setRenameValue] = useState('')

  function commitRename() {
    if (!renameValue.trim()) return
    // update page title via store — reuse updateField-like mutation via reorderPages + applyMutation
    // We mutate formSpec.pages directly through zustand
    useBuilderStore.setState((state) => {
      const { history, historyIndex, formSpec: spec } = state
      const nextSpec = {
        ...spec,
        pages: spec.pages.map((p) =>
          p.id === renameModal.pageId ? { ...p, title: renameValue.trim() } : p,
        ),
      }
      const past = history.slice(0, historyIndex + 1)
      const newHistory = [...past, nextSpec].slice(-50)
      return { formSpec: nextSpec, history: newHistory, historyIndex: newHistory.length - 1, dirty: true }
    })
    setRenameModal({ open: false, pageId: '', current: '' })
    setRenameValue('')
  }

  function commitShowIf(rule: JsonLogicRule | null) {
    useBuilderStore.setState((state) => {
      const { history, historyIndex, formSpec: spec } = state
      const nextSpec = {
        ...spec,
        pages: spec.pages.map((p) =>
          p.id === ruleModal.pageId ? { ...p, show_if: rule } : p,
        ),
      }
      const past = history.slice(0, historyIndex + 1)
      const newHistory = [...past, nextSpec].slice(-50)
      return { formSpec: nextSpec, history: newHistory, historyIndex: newHistory.length - 1, dirty: true }
    })
    setRuleModal({ open: false, pageId: '', rule: null })
  }

  return (
    <>
      <Group gap="xs" align="center" wrap="nowrap" style={{ overflow: 'hidden' }}>
        <Tabs
          value={activePageId}
          onChange={(v) => {
            if (v) {
              onChangeActive(v)
              setSelectedPage(v)
            }
          }}
          style={{ flex: 1, minWidth: 0 }}
        >
          <Tabs.List>
            {pages.map((page) => (
              <Tabs.Tab
                key={page.id}
                value={page.id}
                leftSection={(() => {
                  const pageErrCount = publishErrors.filter(
                    (e) => e.pageId === page.id,
                  ).length
                  if (pageErrCount > 0) {
                    return (
                      <span
                        title={`${pageErrCount} publish error${pageErrCount === 1 ? '' : 's'} on this page`}
                        style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: 'var(--mantine-color-red-6)',
                        }}
                      />
                    )
                  }
                  if (page.show_if) {
                    return (
                      <span
                        title="This page has a show condition"
                        style={{
                          display: 'inline-block',
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'var(--mantine-color-indigo-6)',
                        }}
                      />
                    )
                  }
                  return null
                })()}
                rightSection={
                  <Menu shadow="sm" position="bottom-end" withinPortal>
                    <Menu.Target>
                      <ActionIcon
                        component="span"
                        size="xs"
                        variant="transparent"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Page options for ${page.title}`}
                      >
                        <IconDotsVertical size={12} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconPencil size={14} />}
                        onClick={() => {
                          setRenameModal({ open: true, pageId: page.id, current: page.title })
                          setRenameValue(page.title)
                        }}
                      >
                        Rename
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconEye size={14} />}
                        onClick={() =>
                          setRuleModal({ open: true, pageId: page.id, rule: page.show_if ?? null })
                        }
                      >
                        Set show if
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={14} />}
                        disabled={pages.length <= 1}
                        onClick={() => {
                          removePage(page.id)
                          if (activePageId === page.id) {
                            const remaining = pages.filter((p) => p.id !== page.id)
                            if (remaining[0]) onChangeActive(remaining[0].id)
                          }
                        }}
                      >
                        Delete
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                }
              >
                {page.title}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>

        <Button
          size="xs"
          variant="light"
          leftSection={<IconPlus size={14} />}
          onClick={addPage}
          aria-label="Add page"
          style={{ flexShrink: 0 }}
        >
          Add page
        </Button>
      </Group>

      {/* Rename modal */}
      <Modal
        opened={renameModal.open}
        onClose={() => setRenameModal({ open: false, pageId: '', current: '' })}
        title="Rename page"
        size="sm"
      >
        <TextInput
          label="Page title"
          value={renameValue}
          onChange={(e) => setRenameValue(e.currentTarget.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commitRename() }}
          data-autofocus
        />
        <Group mt="md" justify="flex-end">
          <Button
            variant="light"
            onClick={() => setRenameModal({ open: false, pageId: '', current: '' })}
          >
            Cancel
          </Button>
          <Button onClick={commitRename}>Save</Button>
        </Group>
      </Modal>

      {/* Show-if rule modal */}
      <Modal
        opened={ruleModal.open}
        onClose={() => setRuleModal({ open: false, pageId: '', rule: null })}
        title="Page show condition"
        size="lg"
      >
        <RuleBuilder
          value={ruleModal.rule}
          onChange={(rule) => setRuleModal((s) => ({ ...s, rule }))}
        />
        <Group mt="md" justify="flex-end">
          <Button variant="light" onClick={() => commitShowIf(null)}>
            Clear
          </Button>
          <Button onClick={() => commitShowIf(ruleModal.rule)}>Apply</Button>
        </Group>
      </Modal>
    </>
  )
}
