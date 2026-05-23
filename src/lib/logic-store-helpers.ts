/**
 * logic-store-helpers.ts
 *
 * Thin helpers for the 3A editors (calc, scoring, actions) to mutate
 * FormSpec's new top-level keys without touching store.ts.
 *
 * All helpers go through the existing `useBuilderStore.setState` which
 * pushes to the undo/redo history via the same `commit` pattern used
 * internally by the store.
 */

import { useBuilderStore } from './store'
import type {
  FormSpec,
  FormCalculation,
  FormScoring,
  FormAction,
} from './form-spec.types'

/** Low-level helper: push a full spec replacement through the undo stack. */
export function setSpec(nextSpec: FormSpec): void {
  useBuilderStore.setState((state) => {
    const past = state.history.slice(0, state.historyIndex + 1)
    const history = [...past, nextSpec].slice(-50)
    return {
      formSpec: nextSpec,
      history,
      historyIndex: history.length - 1,
      dirty: true,
    }
  })
}

// ── Calculations ──────────────────────────────────────────────────────────────

export function setCalculations(calcs: FormCalculation[]): void {
  const spec = useBuilderStore.getState().formSpec
  setSpec({ ...spec, calculations: calcs })
}

export function addCalculation(calc: FormCalculation): void {
  const spec = useBuilderStore.getState().formSpec
  setSpec({ ...spec, calculations: [...(spec.calculations ?? []), calc] })
}

export function updateCalculation(id: string, patch: Partial<FormCalculation>): void {
  const spec = useBuilderStore.getState().formSpec
  setSpec({
    ...spec,
    calculations: (spec.calculations ?? []).map((c) =>
      c.id === id ? { ...c, ...patch } : c,
    ),
  })
}

export function removeCalculation(id: string): void {
  const spec = useBuilderStore.getState().formSpec
  setSpec({
    ...spec,
    calculations: (spec.calculations ?? []).filter((c) => c.id !== id),
  })
}

export function reorderCalculations(ids: string[]): void {
  const spec = useBuilderStore.getState().formSpec
  const map = new Map((spec.calculations ?? []).map((c) => [c.id, c]))
  const reordered = ids
    .map((id) => map.get(id))
    .filter((c): c is FormCalculation => c !== undefined)
  setSpec({ ...spec, calculations: reordered })
}

// ── Scoring ───────────────────────────────────────────────────────────────────

export function setScoring(scoring: FormScoring | undefined): void {
  const spec = useBuilderStore.getState().formSpec
  setSpec({ ...spec, scoring })
}

// ── Actions ───────────────────────────────────────────────────────────────────

export function setActions(actions: FormAction[]): void {
  const spec = useBuilderStore.getState().formSpec
  setSpec({ ...spec, actions })
}

export function addAction(action: FormAction): void {
  const spec = useBuilderStore.getState().formSpec
  setSpec({ ...spec, actions: [...(spec.actions ?? []), action] })
}

export function removeAction(index: number): void {
  const spec = useBuilderStore.getState().formSpec
  const next = (spec.actions ?? []).filter((_, i) => i !== index)
  setSpec({ ...spec, actions: next })
}

export function updateAction(index: number, patch: Partial<FormAction>): void {
  const spec = useBuilderStore.getState().formSpec
  setSpec({
    ...spec,
    actions: (spec.actions ?? []).map((a, i) =>
      i === index ? { ...a, ...patch } : a,
    ),
  })
}
