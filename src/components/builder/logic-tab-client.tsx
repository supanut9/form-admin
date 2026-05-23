"use client"

import dynamic from 'next/dynamic'
import type { FormSpec } from '@/lib/form-spec.types'

// dnd-kit hydration safety — same pattern as builder-shell-client.tsx
const LogicTabShell = dynamic(
  () => import('./logic-tab-shell').then((m) => m.LogicTabShell),
  { ssr: false, loading: () => null },
)

export type LogicTab = 'logic' | 'scoring' | 'actions'

interface LogicTabClientProps {
  formId: string
  initialSpec: FormSpec
  tab: LogicTab
}

export function LogicTabClient({ formId, initialSpec, tab }: LogicTabClientProps) {
  return <LogicTabShell formId={formId} initialSpec={initialSpec} tab={tab} />
}
