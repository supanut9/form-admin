import { formClient } from '@/lib/form-client'

// ── Response types ─────────────────────────────────────────────────────────────

export interface FunnelPage {
  pageId: string
  enter: number
  exit: number
}

export interface FunnelData {
  visitors: number
  pages: FunnelPage[]
  submitAttempts: number
  submitOk: number
  submitError: number
  conversionRate: number
}

export interface FunnelDailyPoint {
  day: string
  count: number
}

// ── Query param types ──────────────────────────────────────────────────────────

export interface FunnelParams {
  from: string
  to: string
  version?: string | number
}

export interface FunnelDailyParams {
  from: string
  to: string
  event_name?: string
}

// ── Client functions ───────────────────────────────────────────────────────────

export function getFunnel(
  formIdOrSlug: string,
  params: FunnelParams,
): Promise<FunnelData> {
  const qs = new URLSearchParams()
  qs.set('from', params.from)
  qs.set('to', params.to)
  if (params.version != null) qs.set('version', String(params.version))
  return formClient.get<FunnelData>(
    `/v1/admin/forms/${formIdOrSlug}/funnel?${qs.toString()}`,
  )
}

export function getFunnelDaily(
  formIdOrSlug: string,
  params: FunnelDailyParams,
): Promise<FunnelDailyPoint[]> {
  const qs = new URLSearchParams()
  qs.set('from', params.from)
  qs.set('to', params.to)
  if (params.event_name) qs.set('event_name', params.event_name)
  return formClient.get<FunnelDailyPoint[]>(
    `/v1/admin/forms/${formIdOrSlug}/funnel/daily?${qs.toString()}`,
  )
}
