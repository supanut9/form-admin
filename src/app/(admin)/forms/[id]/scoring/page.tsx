import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { LogicTabClient } from '@/components/builder/logic-tab-client'
import type { FormSpec } from '@/lib/form-spec.types'

const FORM_API_URL = process.env['NEXT_PUBLIC_FORM_API_URL'] ?? 'http://localhost:4200'
const SESSION_COOKIE = 'forms_session'

async function fetchWithAuth(path: string): Promise<Response> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value ?? ''
  return fetch(`${FORM_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ScoringPage({ params }: PageProps) {
  const { id: formId } = await params

  const formRes = await fetchWithAuth(`/admin/forms/${formId}`)
  if (formRes.status === 404) notFound()

  let currentVersion: number | null = null
  if (formRes.ok) {
    const formDef = (await formRes.json()) as { current_version?: number }
    currentVersion = formDef.current_version ?? null
  }

  let initialSpec: FormSpec | null = null
  if (currentVersion !== null) {
    const versionRes = await fetchWithAuth(`/admin/forms/${formId}/versions/${currentVersion}`)
    if (versionRes.ok) {
      const versionData = (await versionRes.json()) as { spec_json?: FormSpec }
      initialSpec = versionData.spec_json ?? null
    }
  }

  if (!initialSpec) {
    initialSpec = {
      id: formId,
      version: 0,
      title: 'Untitled Form',
      type: 'dynamic',
      access: { mode: 'public_anonymous', require_account: false, anonymous_allowed: true },
      pages: [{ id: 'pg_1', title: 'Page 1', fields: [], show_if: null }],
    }
  }

  return <LogicTabClient formId={formId} initialSpec={initialSpec} tab="scoring" />
}
