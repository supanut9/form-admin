import { create } from 'zustand'
import type {
  FormSpec,
  FormPage,
  FormField,
  FormFieldType,
  FormTheme,
  FormAccess,
  FormThankYou,
} from './form-spec.types'

const HISTORY_CAP = 50

/** Lightweight 8-char random ID using crypto.randomUUID substring (no nanoid dep). */
function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
  }
  return Math.random().toString(36).slice(2, 10)
}

function makeBlankSpec(): FormSpec {
  return {
    id: '',
    version: 0,
    title: 'Untitled Form',
    type: 'dynamic',
    access: {
      mode: 'public_anonymous',
      require_account: false,
      anonymous_allowed: true,
    },
    pages: [
      {
        id: `pg_${uid()}`,
        title: 'Page 1',
        fields: [],
        show_if: null,
      },
    ],
  }
}

function makeBlankField(type: FormFieldType): FormField {
  const base = {
    id: `fld_${uid()}`,
    label: `New ${type} field`,
    required: false,
    help_text: undefined as string | undefined,
    show_if: null as null,
  }
  switch (type) {
    case 'text':
      return { ...base, type: 'text' }
    case 'textarea':
      return { ...base, type: 'textarea' }
    case 'number':
      return { ...base, type: 'number' }
    case 'email':
      return { ...base, type: 'email' }
    case 'phone':
      return { ...base, type: 'phone' }
    case 'select':
      return { ...base, type: 'select', options: [] }
    case 'multiselect':
      return { ...base, type: 'multiselect', options: [] }
    case 'checkbox':
      return { ...base, type: 'checkbox' }
    case 'radio':
      return { ...base, type: 'radio', options: [] }
    case 'date':
      return { ...base, type: 'date' }
    case 'file':
      return { ...base, type: 'file' }
    case 'matrix':
      return { ...base, type: 'matrix', columns: [] }
  }
}

/**
 * Publish-guard error from form-api's POST /admin/forms/:id/versions, mapped
 * onto the spec so individual field cards / page tabs can highlight themselves.
 */
export interface MappedPublishError {
  code: string
  message: string
  /** Raw path string from the server, e.g. "pages[0].fields[2].id". */
  path: string
  /** Resolved page id (best-effort — null when the path doesn't include a page). */
  pageId: string | null
  /** Resolved field id (best-effort — null for page-level errors). */
  fieldId: string | null
}

// history[0..historyIndex] = past snapshots; history[historyIndex] = current spec
interface BuilderState {
  formSpec: FormSpec
  selectedFieldId: string | null
  selectedPageId: string | null
  /** Circular buffer of spec snapshots. history[historyIndex] is current. */
  history: FormSpec[]
  historyIndex: number
  dirty: boolean
  /** Last publish attempt's errors. Cleared on next successful save. */
  publishErrors: MappedPublishError[]
}

interface BuilderActions {
  loadSpec: (spec: FormSpec) => void
  addPage: () => void
  removePage: (id: string) => void
  reorderPages: (ids: string[]) => void
  addField: (pageId: string, fieldType: FormFieldType, atIndex?: number) => void
  removeField: (fieldId: string) => void
  updateField: (fieldId: string, patch: Partial<FormField>) => void
  reorderFields: (pageId: string, ids: string[]) => void
  setSelectedField: (id: string | null) => void
  setSelectedPage: (id: string | null) => void
  updateTheme: (patch: Partial<FormTheme>) => void
  updateAccess: (patch: Partial<FormAccess>) => void
  setThankYou: (patch: Partial<FormThankYou>) => void
  updatePrefill: (patch: Partial<import('./form-spec.types').FormPrefillConfig>) => void
  setPublishErrors: (errors: MappedPublishError[]) => void
  undo: () => void
  redo: () => void
  reset: () => void
}

type Store = BuilderState & BuilderActions

/**
 * Push current spec onto the history stack and set nextSpec as current.
 * Truncates any "future" history beyond historyIndex (clears redo branch).
 * Caps the history array at HISTORY_CAP entries.
 */
function commit(state: BuilderState, nextSpec: FormSpec): Partial<BuilderState> {
  // Drop any redo-future beyond current index
  const past = state.history.slice(0, state.historyIndex + 1)
  // Append current spec as a new past entry
  const history = [...past, nextSpec].slice(-HISTORY_CAP)
  return {
    formSpec: nextSpec,
    history,
    historyIndex: history.length - 1,
    dirty: true,
  }
}

function applyMutation(
  state: BuilderState,
  updater: (spec: FormSpec) => FormSpec,
): Partial<BuilderState> {
  return commit(state, updater(state.formSpec))
}

export const useBuilderStore = create<Store>((set) => ({
  // ── initial state ─────────────────────────────────────────────────────────
  formSpec: makeBlankSpec(),
  selectedFieldId: null,
  selectedPageId: null,
  history: [],
  historyIndex: -1,
  dirty: false,
  publishErrors: [],

  // ── actions ───────────────────────────────────────────────────────────────

  loadSpec: (spec) =>
    set({
      formSpec: spec,
      selectedFieldId: null,
      selectedPageId: spec.pages[0]?.id ?? null,
      history: [spec],
      historyIndex: 0,
      dirty: false,
    }),

  addPage: () =>
    set((state) =>
      applyMutation(state, (spec) => ({
        ...spec,
        pages: [
          ...spec.pages,
          {
            id: `pg_${uid()}`,
            title: `Page ${spec.pages.length + 1}`,
            fields: [],
            show_if: null,
          } satisfies FormPage,
        ],
      })),
    ),

  removePage: (id) =>
    set((state) =>
      applyMutation(state, (spec) => ({
        ...spec,
        pages: spec.pages.filter((p) => p.id !== id),
      })),
    ),

  reorderPages: (ids) =>
    set((state) =>
      applyMutation(state, (spec) => {
        const map = new Map(spec.pages.map((p) => [p.id, p]))
        return {
          ...spec,
          pages: ids.map((id) => map.get(id)).filter((p): p is FormPage => p !== undefined),
        }
      }),
    ),

  addField: (pageId, fieldType, atIndex) =>
    set((state) =>
      applyMutation(state, (spec) => {
        const newField = makeBlankField(fieldType)
        return {
          ...spec,
          pages: spec.pages.map((page) => {
            if (page.id !== pageId) return page
            const fields = [...page.fields]
            const idx = atIndex !== undefined ? atIndex : fields.length
            fields.splice(idx, 0, newField)
            return { ...page, fields }
          }),
        }
      }),
    ),

  removeField: (fieldId) =>
    set((state) =>
      applyMutation(state, (spec) => ({
        ...spec,
        pages: spec.pages.map((page) => ({
          ...page,
          fields: page.fields.filter((f) => f.id !== fieldId),
        })),
      })),
    ),

  updateField: (fieldId, patch) =>
    set((state) =>
      applyMutation(state, (spec) => ({
        ...spec,
        pages: spec.pages.map((page) => ({
          ...page,
          fields: page.fields.map((f) =>
            f.id === fieldId ? ({ ...f, ...patch } as FormField) : f,
          ),
        })),
      })),
    ),

  reorderFields: (pageId, ids) =>
    set((state) =>
      applyMutation(state, (spec) => ({
        ...spec,
        pages: spec.pages.map((page) => {
          if (page.id !== pageId) return page
          const map = new Map(page.fields.map((f) => [f.id, f]))
          return {
            ...page,
            fields: ids.map((id) => map.get(id)).filter((f): f is FormField => f !== undefined),
          }
        }),
      })),
    ),

  setSelectedField: (id) => set({ selectedFieldId: id }),

  setSelectedPage: (id) => set({ selectedPageId: id }),

  setPublishErrors: (errors) => set({ publishErrors: errors }),

  updateTheme: (patch) =>
    set((state) =>
      applyMutation(state, (spec) => ({
        ...spec,
        theme: { ...(spec.theme ?? { primary_color: '#4f46e5' }), ...patch },
      })),
    ),

  updateAccess: (patch) =>
    set((state) =>
      applyMutation(state, (spec) => ({
        ...spec,
        access: { ...spec.access, ...patch },
      })),
    ),

  setThankYou: (patch) =>
    set((state) =>
      applyMutation(state, (spec) => ({
        ...spec,
        thank_you: { title: 'Thank you!', ...(spec.thank_you ?? {}), ...patch },
      })),
    ),

  updatePrefill: (patch) =>
    set((state) =>
      applyMutation(state, (spec) => ({
        ...spec,
        prefill: {
          mode: 'none',
          identity: 'authenticated',
          submit_behavior: 'append',
          ...(spec.prefill ?? {}),
          ...patch,
        },
      })),
    ),

  undo: () =>
    set((state) => {
      if (state.historyIndex <= 0) return {}
      const newIndex = state.historyIndex - 1
      return {
        formSpec: state.history[newIndex]!,
        historyIndex: newIndex,
        dirty: true,
      }
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return {}
      const newIndex = state.historyIndex + 1
      return {
        formSpec: state.history[newIndex]!,
        historyIndex: newIndex,
        dirty: true,
      }
    }),

  reset: () =>
    set({
      formSpec: makeBlankSpec(),
      selectedFieldId: null,
      selectedPageId: null,
      history: [],
      historyIndex: -1,
      dirty: false,
    }),
}))
